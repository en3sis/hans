import { and, eq } from 'drizzle-orm'
import {
  AnySelectMenuInteraction,
  ButtonInteraction,
  MessageComponentInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js'
import { db } from '../../db/client'
import { commandUsage, guildsPlugins } from '../../db/schema'
import { onGuildPluginChanged } from '../../controllers/bot/plugins.controller'
import { PLUGIN_REGISTRY, PluginName } from '../../models/plugins.model'
import { encrypt } from '../../utils/crypto'
import { runCustomAction } from './custom-actions'
import { buildPluginModal, extractModalValues } from './modals'
import { renderConfirm, renderItemDrilldown, renderListView, renderPluginPanel } from './render'
import { getPanelSchema } from './schemas'
import { PanelField } from './types'

/* -------------------------------------------------------------------------- */
/* DB helpers                                                                  */
/* -------------------------------------------------------------------------- */

const loadRow = async (guildId: string, name: PluginName) =>
  db.query.guildsPlugins.findFirst({
    where: and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, name)),
  })

const writeMetadata = async (
  guildId: string,
  name: PluginName,
  metadata: unknown,
  enable?: boolean,
): Promise<void> => {
  const patch: { metadata: unknown; enabled?: boolean } = { metadata }
  if (enable !== undefined) patch.enabled = enable
  await db
    .update(guildsPlugins)
    .set(patch)
    .where(and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, name)))
  // Cache invalidation + plugin-specific side effects (e.g. cron rebind).
  await onGuildPluginChanged(guildId, name)
}

/** Field transforms applied before storage. */
const transformForStorage = (field: PanelField, raw: unknown): unknown => {
  // An empty multi-select is a valid "clear" operation, not undefined.
  const isClear =
    raw === '' ||
    raw === undefined ||
    raw === null ||
    (Array.isArray(raw) && raw.length === 0)
  switch (field.kind.type) {
    case 'secret':
      if (isClear) return undefined
      return encrypt(String(raw))
    case 'hour':
      if (isClear) return undefined
      return Number(raw)
    case 'weekdays':
      return Array.isArray(raw) ? raw : isClear ? [] : [raw]
    case 'role':
      if (field.kind.multi) return Array.isArray(raw) ? raw : isClear ? [] : [raw]
      return isClear ? undefined : raw
    case 'choice':
      if (isClear) return undefined
      return field.kind.multi
        ? Array.isArray(raw)
          ? raw
          : [raw]
        : Array.isArray(raw)
          ? raw[0]
          : raw
    default:
      if (isClear) return undefined
      return raw
  }
}

/* -------------------------------------------------------------------------- */
/* Audit logging                                                               */
/* -------------------------------------------------------------------------- */

const logPanelAction = (
  guildId: string | null,
  plugin: PluginName | undefined,
  action: string,
  success: boolean,
) => {
  db.insert(commandUsage)
    .values({
      guild_id: guildId,
      command_name: 'plugins.panel',
      feature_name: plugin ? `${action}:${plugin}` : action,
      source: 'panel',
      success,
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ command_usage(panel) failed: ${msg}`)
    })
}

/* -------------------------------------------------------------------------- */
/* Guards / replies                                                            */
/* -------------------------------------------------------------------------- */

const ensureGuild = (
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
): string | null => interaction.guildId ?? null

const ensureAdmin = (
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
): boolean => !!interaction.memberPermissions?.has(['Administrator'])

const replyError = async (
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  message: string,
) => {
  const content = `❌ ${message}`
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {})
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {})
  }
}

type ViewKey =
  | { kind: 'home' }
  | { kind: 'open'; plugin: PluginName }
  | { kind: 'item'; plugin: PluginName; idx: number }
  | { kind: 'confirm'; plugin: PluginName; action: 'reset' }

const renderView = async (guildId: string, view: ViewKey) => {
  switch (view.kind) {
    case 'home':
      return renderListView(guildId)
    case 'open':
      return renderPluginPanel(guildId, view.plugin)
    case 'item':
      return renderItemDrilldown(guildId, view.plugin, view.idx)
    case 'confirm':
      return renderConfirm(view.plugin, view.action)
  }
}

const refreshPanel = async (
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  guildId: string,
  view: ViewKey,
) => {
  const payload = await renderView(guildId, view)

  if (interaction.isMessageComponent()) {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ components: payload.components })
    } else {
      await interaction.update({ components: payload.components })
    }
    return
  }
  await interaction.editReply({ components: payload.components })
}

/* -------------------------------------------------------------------------- */
/* Button / select handler                                                     */
/* -------------------------------------------------------------------------- */

export const handlePanelComponent = async (
  interaction: ButtonInteraction | AnySelectMenuInteraction,
  parsed: { action: string; plugin?: PluginName; args: string[] },
): Promise<void> => {
  const guildId = ensureGuild(interaction)
  if (!guildId) return replyError(interaction, 'This command can only be used in a server.')
  if (!ensureAdmin(interaction)) return replyError(interaction, 'You do not have permission to manage plugins.')

  let ok = true
  try {
    await dispatchComponent(interaction, parsed, guildId)
  } catch (err) {
    ok = false
    console.error('❌ Panel component handler error:', err)
    await replyError(interaction, err instanceof Error ? err.message : 'Unexpected error.')
  } finally {
    if (parsed.action !== 'sel') {
      // Avoid logging every inline-select firing; selects can be chatty.
      logPanelAction(guildId, parsed.plugin, parsed.action, ok)
    }
  }
}

const dispatchComponent = async (
  interaction: ButtonInteraction | AnySelectMenuInteraction,
  parsed: { action: string; plugin?: PluginName; args: string[] },
  guildId: string,
) => {
  switch (parsed.action) {
    case 'home':
      return refreshPanel(interaction, guildId, { kind: 'home' })

    case 'open': {
      if (!parsed.plugin) return replyError(interaction, 'Unknown plugin.')
      return refreshPanel(interaction, guildId, { kind: 'open', plugin: parsed.plugin })
    }

    case 'item': {
      if (!parsed.plugin) return
      const idx = Number(parsed.args[0])
      if (!Number.isFinite(idx)) return
      return refreshPanel(interaction, guildId, { kind: 'item', plugin: parsed.plugin, idx })
    }

    case 'tog': {
      if (!parsed.plugin) return replyError(interaction, 'Unknown plugin.')
      const row = await loadRow(guildId, parsed.plugin)
      const next = !row?.enabled
      if (!PLUGIN_REGISTRY[parsed.plugin].enabled && next) {
        return replyError(interaction, 'This plugin is globally disabled.')
      }
      await db
        .update(guildsPlugins)
        .set({ enabled: next })
        .where(and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, parsed.plugin)))
      await onGuildPluginChanged(guildId, parsed.plugin)
      return refreshPanel(interaction, guildId, { kind: 'open', plugin: parsed.plugin })
    }

    case 'clr': {
      if (!parsed.plugin) return
      return refreshPanel(interaction, guildId, { kind: 'confirm', plugin: parsed.plugin, action: 'reset' })
    }

    case 'cfm': {
      if (!parsed.plugin) return
      const which = parsed.args[0]
      if (which === 'reset') {
        await writeMetadata(guildId, parsed.plugin, null, false)
      }
      return refreshPanel(interaction, guildId, { kind: 'open', plugin: parsed.plugin })
    }

    case 'edit': {
      if (!parsed.plugin) return
      const idxArg = parsed.args[0]
      const idx = idxArg !== undefined ? Number(idxArg) : undefined
      const row = await loadRow(guildId, parsed.plugin)
      const schema = getPanelSchema(parsed.plugin)
      const prefill =
        schema.list && idx !== undefined && Array.isArray(row?.metadata)
          ? ((row.metadata as Array<Record<string, unknown>>)[idx] ?? {})
          : ((row?.metadata as Record<string, unknown> | null) ?? {})
      const modal = buildPluginModal(parsed.plugin, { idx, prefill })
      if (!modal) return replyError(interaction, 'This plugin has no modal-eligible fields.')
      if (interaction.isButton() || interaction.isAnySelectMenu()) {
        await interaction.showModal(modal)
      }
      return
    }

    case 'add': {
      if (!parsed.plugin) return
      const schema = getPanelSchema(parsed.plugin)
      if (!schema.list) return replyError(interaction, 'This plugin is not a list-style plugin.')
      // Append an empty draft item and drop the user into the drilldown to
      // configure it. Drilldown will reflect each inline-select change live.
      const row = await loadRow(guildId, parsed.plugin)
      const arr = Array.isArray(row?.metadata) ? [...(row.metadata as unknown[])] : []
      arr.push({})
      await writeMetadata(guildId, parsed.plugin, arr)
      return refreshPanel(interaction, guildId, {
        kind: 'item',
        plugin: parsed.plugin,
        idx: arr.length - 1,
      })
    }

    case 'del': {
      if (!parsed.plugin) return
      const idx = Number(parsed.args[0])
      const row = await loadRow(guildId, parsed.plugin)
      const arr = Array.isArray(row?.metadata) ? [...(row.metadata as unknown[])] : []
      if (Number.isFinite(idx) && idx >= 0 && idx < arr.length) {
        arr.splice(idx, 1)
        await writeMetadata(guildId, parsed.plugin, arr)
      }
      return refreshPanel(interaction, guildId, { kind: 'open', plugin: parsed.plugin })
    }

    case 'sel': {
      if (!parsed.plugin) return
      const fieldKey = parsed.args[0]
      const idxArg = parsed.args[1]
      const idx = idxArg !== undefined ? Number(idxArg) : undefined
      if (!fieldKey || !interaction.isAnySelectMenu()) return
      await handleInlineSelect(interaction as AnySelectMenuInteraction, guildId, parsed.plugin, fieldKey, idx)
      if (idx !== undefined) {
        return refreshPanel(interaction, guildId, { kind: 'item', plugin: parsed.plugin, idx })
      }
      return refreshPanel(interaction, guildId, { kind: 'open', plugin: parsed.plugin })
    }

    case 'act': {
      if (!parsed.plugin) return
      const actionId = parsed.args[0]
      if (!actionId || !interaction.isButton()) return
      // Defer the button click so the panel doesn't get re-rendered; the
      // custom action posts its result as a follow-up.
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => {})
      }
      await runCustomAction(parsed.plugin, actionId, { interaction, guildId })
      return
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Modal submit handler                                                        */
/* -------------------------------------------------------------------------- */

export const handlePanelModalSubmit = async (
  interaction: ModalSubmitInteraction,
  parsed: { action: string; plugin?: PluginName; args: string[] },
): Promise<void> => {
  if (parsed.action !== 'save' || !parsed.plugin) return
  const guildId = ensureGuild(interaction)
  if (!guildId) return replyError(interaction, 'Server context required.')
  if (!ensureAdmin(interaction)) return replyError(interaction, 'Admin permission required.')

  const { values, errors } = extractModalValues(parsed.plugin, interaction)
  if (errors.length > 0) {
    logPanelAction(guildId, parsed.plugin, 'save', false)
    return replyError(interaction, errors.join('\n'))
  }

  const schema = getPanelSchema(parsed.plugin)
  const fields = schema.list ? schema.list.fields : (schema.fields ?? [])
  const transformed: Record<string, unknown> = {}
  for (const f of fields) {
    if (values[f.key] === undefined) continue
    const t = transformForStorage(f, values[f.key])
    if (t !== undefined) transformed[f.key] = t
  }

  await applyTransformedValues(guildId, parsed.plugin, transformed, parsed.args[0])
  logPanelAction(guildId, parsed.plugin, 'save', true)

  // Return to the right view: item drilldown if list, else plugin panel.
  if (schema.list && parsed.args[0] !== undefined) {
    return refreshPanel(interaction, guildId, {
      kind: 'item',
      plugin: parsed.plugin,
      idx: Number(parsed.args[0]),
    })
  }
  return refreshPanel(interaction, guildId, { kind: 'open', plugin: parsed.plugin })
}

/* -------------------------------------------------------------------------- */
/* Inline select handler                                                       */
/* -------------------------------------------------------------------------- */

const handleInlineSelect = async (
  interaction: AnySelectMenuInteraction,
  guildId: string,
  plugin: PluginName,
  fieldKey: string,
  itemIdx?: number,
): Promise<void> => {
  const schema = getPanelSchema(plugin)
  const fields = schema.list ? schema.list.fields : (schema.fields ?? [])
  const field = fields.find((f) => f.key === fieldKey)
  if (!field) return

  await interaction.deferUpdate().catch(() => {})

  const raw = pickSelectValue(interaction, field)
  const transformed = raw === null ? undefined : transformForStorage(field, raw)
  const patch =
    transformed === undefined ? { [field.key]: undefined } : { [field.key]: transformed }

  await applyTransformedValues(guildId, plugin, patch, itemIdx !== undefined ? String(itemIdx) : undefined)
}

const pickSelectValue = (
  interaction: AnySelectMenuInteraction,
  field: PanelField,
): string | string[] | null => {
  if (interaction.isChannelSelectMenu()) return interaction.values[0] ?? null
  if (interaction.isRoleSelectMenu()) {
    if (field.kind.type === 'role' && field.kind.multi) return interaction.values
    return interaction.values[0] ?? null
  }
  if (interaction.isStringSelectMenu()) {
    if (field.kind.type === 'weekdays' || (field.kind.type === 'choice' && field.kind.multi)) {
      return interaction.values
    }
    return interaction.values[0] ?? null
  }
  return null
}

/* -------------------------------------------------------------------------- */
/* Persistence (object vs list aware, runs schema.transform)                   */
/* -------------------------------------------------------------------------- */

const applyTransformedValues = async (
  guildId: string,
  plugin: PluginName,
  patch: Record<string, unknown>,
  idxArg?: string,
): Promise<void> => {
  const schema = getPanelSchema(plugin)
  const row = await loadRow(guildId, plugin)
  const transform = schema.transform ?? ((x: Record<string, unknown>) => x)

  if (schema.list) {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
    const arr = Array.isArray(row?.metadata)
      ? [...(row.metadata as Array<Record<string, unknown>>)]
      : []
    const idx = idxArg !== undefined ? Number(idxArg) : undefined

    if (idx !== undefined && Number.isFinite(idx) && idx >= 0 && idx < arr.length) {
      arr[idx] = transform({ ...arr[idx], ...clean })
    } else {
      const idKey = schema.list.idKey
      const existingIdx =
        clean[idKey] !== undefined ? arr.findIndex((it) => it[idKey] === clean[idKey]) : -1
      if (existingIdx >= 0) arr[existingIdx] = transform({ ...arr[existingIdx], ...clean })
      else arr.push(transform(clean))
    }
    await writeMetadata(guildId, plugin, arr, true)
    return
  }

  const current =
    row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  const next: Record<string, unknown> = { ...current }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k]
    else next[k] = v
  }
  await writeMetadata(guildId, plugin, transform(next), true)
}
