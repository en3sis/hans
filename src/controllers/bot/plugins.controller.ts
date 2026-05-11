import { and, eq } from 'drizzle-orm'
import { CommandInteraction } from 'discord.js'
import { db } from '../../db/client'
import { guilds, guildsPlugins, plugins } from '../../db/schema'
import { deleteFromCache, getFromCache, setToCache } from '../../libs/node-cache'
import {
  PLUGIN_NAMES,
  PLUGIN_REGISTRY,
  PluginName,
  isPluginName,
} from '../../models/plugins.model'
import {
  GuildPluginData,
  PluginMetadataMap,
  PluginsThreadsMetadata,
  PluginsThreadsSettings,
} from '../../types/plugins'
import { encrypt } from '../../utils/crypto'
import { registerStandupSchedules } from '../plugins/standup.controller'
import { stopSpecificCronJob } from '../tasks/cron-jobs'

const cacheKey = (guildId: string, plugin: string) => `guilds_plugins:${guildId}:${plugin}`

/** After any write to guilds_plugins: invalidate cache, re-register standup cron if relevant. */
const onGuildPluginChanged = async (guildId: string, pluginName: string) => {
  deleteFromCache(cacheKey(guildId, pluginName))
  if (pluginName === 'standup') {
    stopSpecificCronJob(`${guildId}#standup`)
    const row = await db.query.guildsPlugins.findFirst({
      where: and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, 'standup')),
    })
    if (row?.enabled && row.metadata) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await registerStandupSchedules(guildId, row.metadata as any)
    }
  }
}

/** Resolve the initial `enabled` value for (guild, plugin) at insert time. */
const defaultEnabledFor = (name: string, fallback: boolean): boolean =>
  isPluginName(name) ? PLUGIN_REGISTRY[name].defaultEnabled : fallback

export const insertGuildPlugin = async (guild_id: string): Promise<void> => {
  try {
    const allPlugins = await db.query.plugins.findMany()
    const existing = await db.query.guildsPlugins.findMany({
      where: eq(guildsPlugins.owner, guild_id),
      columns: { name: true },
    })
    const present = new Set(existing.map((e) => e.name))

    const toInsert = allPlugins
      .filter((p) => !present.has(p.name))
      .map((p) => ({
        name: p.name,
        owner: guild_id,
        enabled: defaultEnabledFor(p.name, p.enabled ?? false),
        metadata: null,
      }))

    if (toInsert.length === 0) return
    await db.insert(guildsPlugins).values(toInsert)
  } catch (error) {
    console.error('❌ ERROR: insertGuildPlugin', error)
  }
}

/**
 * Ensures every existing guild has a `guilds_plugins` row for every plugin
 * in the registry. Run at startup so newly-added plugins automatically
 * appear on existing guilds without manual migration.
 */
export const backfillAllGuildPlugins = async (): Promise<void> => {
  try {
    const allGuilds = await db.query.guilds.findMany({ columns: { guild_id: true } })
    for (const g of allGuilds) {
      await insertGuildPlugin(g.guild_id)
    }
    if (allGuilds.length > 0) {
      console.log(`🔄 Plugin backfill checked ${allGuilds.length} guild(s)`)
    }
  } catch (error) {
    console.error('❌ ERROR: backfillAllGuildPlugins', error)
  }
}

export const resolveGuildPlugins = async (
  guild_id: string,
  pluginName: string,
): Promise<GuildPluginData | undefined> => {
  try {
    const cached = getFromCache(cacheKey(guild_id, pluginName))
    if (cached) return cached as GuildPluginData

    const guild = await db.query.guilds.findFirst({
      where: eq(guilds.guild_id, guild_id),
      columns: { premium: true },
    })
    if (!guild) return undefined

    const rows = await db
      .select({
        gp_id: guildsPlugins.id,
        gp_name: guildsPlugins.name,
        gp_owner: guildsPlugins.owner,
        gp_enabled: guildsPlugins.enabled,
        gp_metadata: guildsPlugins.metadata,
        gp_created_at: guildsPlugins.created_at,
        p_name: plugins.name,
        p_enabled: plugins.enabled,
        p_description: plugins.description,
        p_premium: plugins.premium,
      })
      .from(guildsPlugins)
      .leftJoin(plugins, eq(plugins.name, guildsPlugins.name))
      .where(and(eq(guildsPlugins.owner, guild_id), eq(guildsPlugins.name, pluginName)))
      .limit(1)

    const match = rows[0]
    if (!match) return { enabled: false, metadata: undefined, data: undefined }
    if (!match.gp_enabled || !match.p_enabled) {
      return { enabled: false, metadata: undefined, data: undefined }
    }

    const data = {
      id: match.gp_id,
      name: match.gp_name,
      owner: match.gp_owner,
      enabled: match.gp_enabled,
      metadata: match.gp_metadata,
      created_at: match.gp_created_at,
      premium: !!guild.premium,
      plugins: {
        name: match.p_name,
        enabled: match.p_enabled,
        description: match.p_description,
        premium: match.p_premium,
      },
    }

    const pluginData: GuildPluginData = {
      enabled: match.gp_enabled,
      metadata: match.gp_metadata,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    }

    const cacheable = isPluginName(pluginName) ? PLUGIN_REGISTRY[pluginName].cacheable : true
    if (cacheable) {
      setToCache(cacheKey(guild_id, pluginName), pluginData, 60 * 5)
    }
    return pluginData
  } catch (error) {
    console.error('❌ ERROR: resolveGuildPlugin', error)
  }
}

/**
 * Type-safe wrapper around resolveGuildPlugins. Returns metadata narrowed
 * to the shape declared in PluginMetadataMap for the given plugin.
 *
 *   const cfg = await getPluginConfig(guildId, 'chatGtp')
 *   cfg?.metadata.api_key  // string | undefined — no `as any` needed
 */
export const getPluginConfig = async <K extends PluginName>(
  guildId: string,
  name: K,
): Promise<
  | { enabled: boolean; metadata: PluginMetadataMap[K] | null; data: GuildPluginData['data'] }
  | undefined
> => {
  const resolved = await resolveGuildPlugins(guildId, name)
  if (!resolved) return undefined
  return {
    enabled: resolved.enabled,
    metadata: (resolved.metadata ?? null) as PluginMetadataMap[K] | null,
    data: resolved.data,
  }
}

export const toggleGuildPlugin = async (
  interaction: CommandInteraction,
  name: string,
  toggle: boolean,
): Promise<void> => {
  try {
    await db
      .update(guildsPlugins)
      .set({ enabled: toggle })
      .where(and(eq(guildsPlugins.name, name), eq(guildsPlugins.owner, interaction.guildId!)))
    await onGuildPluginChanged(interaction.guildId!, name)

    await interaction.editReply({
      content: `The plugin ${name} was successfully ${toggle ? 'enabled' : 'disabled'}`,
    })
  } catch (error) {
    console.log('❌ ERROR: toggleGuildPlugin(): ', error)
  }
}

export const updateMetadataGuildPlugin = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any,
  name: string,
  guildId: string,
  enable?: boolean,
) => {
  try {
    const patch: { metadata: unknown; enabled?: boolean } = { metadata }
    if (enable !== undefined) patch.enabled = enable

    const result = await db
      .update(guildsPlugins)
      .set(patch)
      .where(and(eq(guildsPlugins.name, name), eq(guildsPlugins.owner, guildId)))
      .returning()

    if (result.length === 0) throw new Error('No rows were updated')

    await onGuildPluginChanged(guildId, name)
    return result[0]
  } catch (error) {
    console.error('❌ ERROR: updateMetadataGuildPlugin(): ', error)
    throw error
  }
}

export const pluginsListNames = (): Array<{ name: string; value: string }> =>
  PLUGIN_NAMES.map((name) => ({ name, value: name }))

// =+=+=+ Chat GPT Plugin =+=+=+
export const pluginChatGPTSettings = async (
  interaction: CommandInteraction,
  api_key: string,
  org: string,
) => {
  try {
    const current = await db.query.guildsPlugins.findFirst({
      where: and(
        eq(guildsPlugins.name, 'chatGtp'),
        eq(guildsPlugins.owner, interaction.guildId!),
      ),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _metadata = (current?.metadata as any) || {}

    await db
      .update(guildsPlugins)
      .set({
        metadata: { ..._metadata, api_key: encrypt(api_key), org: encrypt(org) },
      })
      .where(
        and(eq(guildsPlugins.name, 'chatGtp'), eq(guildsPlugins.owner, interaction.guildId!)),
      )
    await onGuildPluginChanged(interaction.guildId!, 'chatGtp')

    await interaction.deferReply({ ephemeral: true })
    return await interaction.editReply({
      content: `The plugin chat-gpt was successfully configured, you can now run the /ask command`,
    })
  } catch (error) {
    console.log('❌ ERROR: pluginChatGPTSettings(): ', error)
  }
}

// =+=+=+ Threads Plugin =+=+=+
export const pluginThreadsSettings = async ({ interaction, metadata }: PluginsThreadsSettings) => {
  try {
    const current = await db.query.guildsPlugins.findFirst({
      where: and(
        eq(guildsPlugins.name, 'threads'),
        eq(guildsPlugins.owner, interaction.guildId!),
      ),
    })

    const filteredMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== null),
    ) as PluginsThreadsMetadata

    let updatedMetadata: PluginsThreadsMetadata[]
    if (current?.metadata) {
      const arr = current.metadata as PluginsThreadsMetadata[]
      const idx = arr.findIndex((item) => item.channelId === metadata.channelId)
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...filteredMetadata }
        updatedMetadata = arr
      } else {
        updatedMetadata = [...arr, filteredMetadata]
      }
    } else {
      updatedMetadata = [filteredMetadata]
    }

    await db
      .update(guildsPlugins)
      .set({ metadata: updatedMetadata })
      .where(
        and(eq(guildsPlugins.name, 'threads'), eq(guildsPlugins.owner, interaction.guildId!)),
      )
    await onGuildPluginChanged(interaction.guildId!, 'threads')

    return await interaction.editReply({
      content: `The plugin threads was successfully configured`,
    })
  } catch (error) {
    console.log('❌ ERROR: pluginThreadsSettings(): ', error)
    return await interaction.editReply({
      content: `There was an error configuring the plugin for the current channel`,
    })
  }
}
