import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ContainerBuilder,
  MessageFlags,
  RoleSelectMenuBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from 'discord.js'
import type { CustomAction } from './types'
import {
  PLUGIN_NAMES,
  PLUGIN_REGISTRY,
  PluginName,
} from '../../models/plugins.model'
import { getPluginConfig } from '../../controllers/bot/plugins.controller'
import { buildCustomId } from './router'
import { getPanelSchema } from './schemas'
import {
  HOURS,
  PanelField,
  PluginPanelSchema,
  WEEKDAYS,
} from './types'

const MAX_PANEL_ROWS = 5

/** Hans support server invite — surfaced as a Link button on the list view. */
const SUPPORT_INVITE_URL = 'https://discord.com/invite/sMmbbSefwH'

interface PanelPayload {
  flags: number
  components: ContainerBuilder[]
}

/** Common payload flags: v2 components + ephemeral. */
const PANEL_FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral

/* -------------------------------------------------------------------------- */
/* List view                                                                   */
/* -------------------------------------------------------------------------- */

interface ListViewRow {
  name: PluginName
  label: string
  icon: string
  enabled: boolean
  description: string
  premium: boolean
}

/** Build the top-level `/plugins` view. */
export const renderListView = async (guildId: string): Promise<PanelPayload> => {
  const rows: ListViewRow[] = []
  for (const name of PLUGIN_NAMES) {
    const def = PLUGIN_REGISTRY[name]
    // Globally-disabled plugins are hidden from the admin UI — they can't
    // be turned on per-guild anyway, so showing them is just noise.
    if (!def.enabled) continue
    const cfg = await getPluginConfig(guildId, name)
    rows.push({
      name,
      label: def.label,
      icon: def.icon,
      enabled: cfg?.enabled ?? false,
      description: def.description,
      premium: def.premium,
    })
  }

  const enabledCount = rows.filter((r) => r.enabled).length
  const container = new ContainerBuilder()
  // Support link folded into the header so we stay under Discord's 40-component
  // v2 message ceiling (12 plugin rows × 3 components each leaves little slack).
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🧩 Server Plugins\n${enabledCount} of ${rows.length} enabled · click **Configure** to manage one.\n-# 💬 Feedback or help? [Join the Hans Discord](${SUPPORT_INVITE_URL})`,
    ),
  )

  for (const row of rows) {
    const status = row.enabled ? '✅' : '⛔'
    const premium = row.premium ? ' · 💎 Premium' : ''
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${status}  ·  ${row.icon}  **${row.label}**${premium}\n-# ${row.description}`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(buildCustomId('open', row.name))
            .setLabel('Configure')
            .setStyle(ButtonStyle.Secondary),
        ),
    )
  }

  return { flags: PANEL_FLAGS, components: [container] }
}

/* -------------------------------------------------------------------------- */
/* Plugin panel                                                                */
/* -------------------------------------------------------------------------- */

/** Render the per-plugin settings panel. */
export const renderPluginPanel = async (
  guildId: string,
  name: PluginName,
): Promise<PanelPayload> => {
  const schema = getPanelSchema(name)
  const cfg = await getPluginConfig(guildId, name)
  const enabled = cfg?.enabled ?? false
  const meta = (cfg?.metadata ?? null) as unknown

  const container = new ContainerBuilder()
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(buildHeader(name, enabled, schema)),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )

  if (schema.list) {
    appendListBody(container, name, schema, meta)
  } else if (schema.fields && schema.fields.length > 0) {
    appendObjectBody(container, name, schema.fields, asRecord(meta))
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('_No configuration — just toggle to use._'),
    )
  }

  if (schema.customActions && schema.customActions.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...buildCustomActionButtons(name, schema.customActions),
      ),
    )
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(buildFooterButtons(name, enabled, schema)),
  )

  return { flags: PANEL_FLAGS, components: [container] }
}

/** Per-item drilldown for list plugins. Treats one item as object metadata. */
export const renderItemDrilldown = async (
  guildId: string,
  name: PluginName,
  idx: number,
): Promise<PanelPayload> => {
  const schema = getPanelSchema(name)
  if (!schema.list) {
    return renderPluginPanel(guildId, name)
  }
  const cfg = await getPluginConfig(guildId, name)
  const meta = cfg?.metadata
  const items = Array.isArray(meta) ? (meta as Array<Record<string, unknown>>) : []
  const item = items[idx]
  if (!item) {
    return renderPluginPanel(guildId, name)
  }

  const container = new ContainerBuilder()
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${schema.title ?? name} — item ${idx + 1}\n${schema.list.summary(item)}`,
    ),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )

  // Field summary
  const summary = schema.list.fields
    .map((f) => `**${f.label}:** ${displayValue(f, item[f.key])}`)
    .join('\n')
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(summary))

  // Inline rows (channel/role/hour/weekdays/choice) — one per inline field
  let rows = 0
  for (const f of schema.list.fields) {
    if (!isInlineKind(f.kind.type)) continue
    if (rows >= MAX_PANEL_ROWS - 2) break
    container.addActionRowComponents(buildInlineRow(name, f, item[f.key], idx))
    rows++
  }

  // Footer
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
  const hasModalField = schema.list.fields.some((f) => !isInlineKind(f.kind.type))
  const footer: ButtonBuilder[] = []
  if (hasModalField) {
    footer.push(
      new ButtonBuilder()
        .setCustomId(buildCustomId('edit', name, idx))
        .setLabel('Edit text fields')
        .setStyle(ButtonStyle.Primary),
    )
  }
  footer.push(
    new ButtonBuilder()
      .setCustomId(buildCustomId('del', name, idx))
      .setLabel('Remove')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildCustomId('open', name))
      .setLabel('← Back')
      .setStyle(ButtonStyle.Secondary),
  )
  container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(footer))

  return { flags: PANEL_FLAGS, components: [container] }
}

/** Confirmation prompt for destructive actions (Reset). */
export const renderConfirm = (
  name: PluginName,
  action: 'reset',
): PanelPayload => {
  const container = new ContainerBuilder()
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ⚠️ Confirm reset\nThis will delete all saved configuration for **${name}** and disable it. This cannot be undone.`,
    ),
  )
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildCustomId('cfm', name, action))
        .setLabel('Yes, reset')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(buildCustomId('open', name))
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    ),
  )
  return { flags: PANEL_FLAGS, components: [container] }
}

/** Plain status header for the plugin. */
const buildHeader = (
  name: PluginName,
  enabled: boolean,
  schema: PluginPanelSchema,
): string => {
  const def = PLUGIN_REGISTRY[name]
  const title = schema.title ?? `${def.icon} ${def.label}`
  const status = enabled ? '✅ Enabled' : '⛔ Disabled'
  const premium = def.premium ? ' · 💎 Premium' : ''
  return `## ${title}\n${status}${premium}\n-# ${def.description}`
}

/* -------------------------------------------------------------------------- */
/* Object-style body (one config blob)                                         */
/* -------------------------------------------------------------------------- */

const appendObjectBody = (
  container: ContainerBuilder,
  name: PluginName,
  fields: PanelField[],
  meta: Record<string, unknown>,
): void => {
  const summary = fields.map((f) => `**${f.label}:** ${displayValue(f, meta[f.key])}`).join('\n')
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(summary))

  // Inline-component fields render directly on the panel; the rest go in a modal.
  let rows = 0
  for (const f of fields) {
    if (!isInlineKind(f.kind.type)) continue
    if (rows >= MAX_PANEL_ROWS - 2) break // reserve rows for footer + separator
    container.addActionRowComponents(buildInlineRow(name, f, meta[f.key]))
    rows++
  }
}

/* -------------------------------------------------------------------------- */
/* List-style body                                                             */
/* -------------------------------------------------------------------------- */

const appendListBody = (
  container: ContainerBuilder,
  name: PluginName,
  schema: PluginPanelSchema,
  meta: unknown,
): void => {
  const items = Array.isArray(meta) ? (meta as Array<Record<string, unknown>>) : []
  const list = schema.list!

  if (items.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('_No items yet. Use **Add** below._'),
    )
  } else {
    for (let i = 0; i < items.length; i++) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${i + 1}. ${list.summary(items[i])}`),
          )
          // Open drilldown for this item — Remove lives inside the drilldown
          // to prevent accidental clicks; encourages reviewing before deleting.
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(buildCustomId('item', name, i))
              .setLabel('Open')
              .setStyle(ButtonStyle.Secondary),
          ),
      )
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Field renderers                                                             */
/* -------------------------------------------------------------------------- */

const isInlineKind = (type: PanelField['kind']['type']): boolean =>
  type === 'channel' || type === 'role' || type === 'hour' || type === 'weekdays' || type === 'choice'

const buildInlineRow = (
  name: PluginName,
  field: PanelField,
  currentValue: unknown,
  itemIdx?: number,
): ActionRowBuilder<
  ChannelSelectMenuBuilder | RoleSelectMenuBuilder | StringSelectMenuBuilder
> => {
  const k = field.kind
  // For list items we encode the index so the save handler knows which row.
  const customId =
    itemIdx !== undefined
      ? buildCustomId('sel', name, field.key, itemIdx)
      : buildCustomId('sel', name, field.key)

  switch (k.type) {
    case 'channel': {
      const sel = new ChannelSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(k.placeholder ?? field.label)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(1)
      if (k.channelTypes && k.channelTypes.length > 0) sel.setChannelTypes(...k.channelTypes)
      if (typeof currentValue === 'string' && currentValue) {
        sel.setDefaultChannels([currentValue])
      }
      return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(sel)
    }
    case 'role': {
      const sel = new RoleSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(k.placeholder ?? field.label)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(k.multi ? 25 : 1)
      const defaults = k.multi
        ? Array.isArray(currentValue)
          ? (currentValue as string[])
          : []
        : typeof currentValue === 'string' && currentValue
          ? [currentValue]
          : []
      if (defaults.length > 0) sel.setDefaultRoles(defaults)
      return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(sel)
    }
    case 'hour': {
      const sel = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(field.label)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(1)
      const current = typeof currentValue === 'number' ? String(currentValue) : undefined
      sel.addOptions(
        HOURS.map((h) => ({
          label: h.label,
          value: h.value,
          default: current === h.value,
        })),
      )
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sel)
    }
    case 'weekdays': {
      const cur = new Set(Array.isArray(currentValue) ? (currentValue as string[]) : [])
      const sel = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(field.label)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(WEEKDAYS.length)
        .addOptions(
          WEEKDAYS.map((d) => ({ label: d.label, value: d.value, default: cur.has(d.value) })),
        )
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sel)
    }
    case 'choice': {
      const cur = new Set(
        Array.isArray(currentValue)
          ? (currentValue as string[])
          : typeof currentValue === 'string'
            ? [currentValue]
            : [],
      )
      const sel = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(k.placeholder ?? field.label)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(k.multi ? k.options.length : 1)
        .addOptions(
          k.options.map((o) => ({
            label: o.label,
            value: o.value,
            description: o.description,
            default: cur.has(o.value),
          })),
        )
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sel)
    }
    default:
      throw new Error(`buildInlineRow called with non-inline kind: ${k.type}`)
  }
}

/** Footer button bar: Add/Edit, Toggle, Reset, Back. */
const buildFooterButtons = (
  name: PluginName,
  enabled: boolean,
  schema: PluginPanelSchema,
): ButtonBuilder[] => {
  const buttons: ButtonBuilder[] = []

  if (schema.list) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(buildCustomId('add', name))
        .setLabel(schema.list.addLabel ?? 'Add')
        .setStyle(ButtonStyle.Primary),
    )
  } else if (hasModalFields(schema)) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(buildCustomId('edit', name))
        .setLabel('Edit')
        .setStyle(ButtonStyle.Primary),
    )
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(buildCustomId('tog', name))
      .setLabel(enabled ? 'Disable' : 'Enable')
      .setStyle(enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
  )

  if (hasConfig(schema)) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(buildCustomId('clr', name))
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger),
    )
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId(buildCustomId('home'))
      .setLabel('← Back')
      .setStyle(ButtonStyle.Secondary),
  )

  return buttons
}

const buildCustomActionButtons = (
  name: PluginName,
  actions: CustomAction[],
): ButtonBuilder[] =>
  actions.map((a) => {
    const style =
      a.style === 'primary'
        ? ButtonStyle.Primary
        : a.style === 'success'
          ? ButtonStyle.Success
          : a.style === 'danger'
            ? ButtonStyle.Danger
            : ButtonStyle.Secondary
    return new ButtonBuilder()
      .setCustomId(buildCustomId('act', name, a.id))
      .setLabel(a.label)
      .setStyle(style)
  })

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const hasModalFields = (schema: PluginPanelSchema): boolean => {
  const fields = schema.list ? schema.list.fields : (schema.fields ?? [])
  return fields.some((f) => !isInlineKind(f.kind.type))
}

const hasConfig = (schema: PluginPanelSchema): boolean =>
  !!schema.list || !!(schema.fields && schema.fields.length > 0)

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** User-facing rendering of a stored value. */
const displayValue = (field: PanelField, value: unknown): string => {
  if (value === undefined || value === null || value === '') return '_unset_'
  switch (field.kind.type) {
    case 'channel':
      return `<#${value}>`
    case 'role':
      if (Array.isArray(value))
        return (value as string[]).map((id) => `<@&${id}>`).join(' ') || '_unset_'
      return `<@&${value}>`
    case 'secret':
      return maskSecret(String(value))
    case 'hour':
      return typeof value === 'number' ? `${value}:00 UTC` : String(value)
    case 'weekdays':
      return Array.isArray(value) ? (value as string[]).join(', ') : String(value)
    case 'text':
    case 'string':
      return truncate(String(value), 80)
    default:
      return String(value)
  }
}

const maskSecret = (raw: string): string => {
  if (raw.length <= 6) return '••••••'
  return `${raw.slice(0, 3)}…${raw.slice(-4)}`
}

const truncate = (s: string, n: number): string => (s.length <= n ? s : `${s.slice(0, n - 1)}…`)
