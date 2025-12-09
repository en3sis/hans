import { CommandInteraction } from 'discord.js'
import { and, eq, inArray } from 'drizzle-orm'
import { getFromCache, setToCache } from '../../libs/node-cache'
import { db } from '../../libs/drizzle'
import { guilds, guildsPlugins, plugins } from '../../db/schema'
import { initialGuildPluginState, pluginsList } from '../../models/plugins.model'
import {
  GuildPluginData,
  PluginsThreadsSettings,
  PluginsThreadsMetadata,
} from '../../types/plugins'
import { encrypt } from '../../utils/crypto'

export type GuildPluginRow = typeof guildsPlugins.$inferSelect

/**
 * Inserts a new row in the guilds_plugins table for each plugin in the plugins table.
 * @param {string} guild_id - The ID of the guild to insert the plugins for.
 * @returns {Promise<void>} - A Promise that resolves when the plugins have been inserted.
 */
export const insertGuildPlugin = async (guild_id: string): Promise<void> => {
  try {
    const allPlugins = await db.select().from(plugins)

    const guildPluginsList: Omit<GuildPluginRow, 'id' | 'metadata'>[] = allPlugins.map((plugin) => ({
      owner: guild_id,
      enabled: initialGuildPluginState[plugin.name]?.default_enabled ?? plugin.enabled,
      name: plugin.name,
      createdAt: new Date().toISOString(),
    }))

    // check if a row with the same plugin name and guild_id exists
    const existingGuildPlugins = await db
      .select()
      .from(guildsPlugins)
      .where(
        and(
          inArray(
            guildsPlugins.name,
            guildPluginsList.map((gp) => gp.name),
          ),
          eq(guildsPlugins.owner, guild_id),
        ),
      )

    const newGuildPlugins = guildPluginsList.filter((gp) => {
      const existingPlugin = existingGuildPlugins.find(
        (egp) => egp.name === gp.name && egp.owner === guild_id,
      )
      return !existingPlugin
    })

    if (newGuildPlugins.length > 0) {
      await db.insert(guildsPlugins).values(newGuildPlugins).onConflictDoNothing()
    }
  } catch (error) {
    console.error('❌ ERROR: insertGuildPlugin', error)
  }
}

/**
 * Finds all guild plugins for a given guild.
 * @param {string} guild_id - The ID of the guild to find the plugins for.
 * @returns {Promise<any>} - A Promise that resolves with the guild plugins data.
 */
export const findGuildPlugins = async (guild_id: string) => {
  try {
    const result = await db.query.guilds.findFirst({
      where: eq(guilds.guildId, guild_id),
      with: {
        guildsPlugins: {
          with: {
            plugin: true,
          },
        },
      },
    })

    return result ? [result] : []
  } catch (error) {
    console.error('❌ ERROR: findGuildPlugins', error)
  }
}

/**
 * Resolves a guild plugin for a given guild and plugin name.
 * @param {string} guild_id - The ID of the guild to resolve the plugin for.
 * @param {string} pluginName - The name of the plugin to resolve.
 * @returns {Promise<GuildPluginData>} - A Promise that resolves with the resolved guild plugin data.
 */
export const resolveGuildPlugins = async (
  guild_id: string,
  pluginName: string,
): Promise<GuildPluginData> => {
  try {
    // Return the cached data if it exists
    const cachedData = getFromCache(`guilds_plugins:${guild_id}:${pluginName}`)

    if (cachedData) {
      return cachedData as GuildPluginData
    }

    const guildPluginResult = await db.query.guilds.findFirst({
      where: eq(guilds.guildId, guild_id),
      with: {
        guildsPlugins: {
          with: {
            plugin: true,
          },
        },
      },
    })

    if (!guildPluginResult) return

    const guildPlugin = guildPluginResult?.guildsPlugins.find(
      (ele: GuildPluginRow) => ele.name === pluginName,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalPluginSettings: Record<string, any> = guildPlugin?.plugin

    if (guildPlugin && guildPlugin.enabled && globalPluginSettings?.enabled) {
      const pluginData = {
        enabled: guildPlugin?.enabled || false,
        metadata: JSON.parse(JSON.stringify(guildPlugin?.metadata)),
        data: guildPlugin,
      }

      if (pluginName !== 'chatGtp') {
        setToCache(`guilds_plugins:${guild_id}:${pluginName}`, pluginData, 60 * 5)
      }

      return pluginData
    } else {
      return {
        enabled: false,
        metadata: undefined,
        data: undefined,
      }
    }
  } catch (error) {
    console.error('❌ ERROR: resolveGuildPlugin', error)
  }
}

/**
 * Toggles the enabled state of a guild plugin.
 * @param {CommandInteraction} interaction - The interaction object that triggered the toggle.
 * @param {string} name - The name of the plugin to toggle.
 * @param {boolean} toggle - The new enabled state of the plugin.
 * @returns {Promise<void>} - A Promise that resolves with the updated plugin data.
 */
export const toggleGuildPlugin = async (
  interaction: CommandInteraction,
  name: string,
  toggle: boolean,
): Promise<void> => {
  try {
    await db
      .update(guildsPlugins)
      .set({ enabled: toggle })
      .where(and(eq(guildsPlugins.name, name), eq(guildsPlugins.owner, interaction.guildId)))

    await interaction.editReply({
      content: `The plugin ${name} was successfully ${toggle ? 'enabled' : 'disabled'}`,
    })
  } catch (error) {
    console.log('❌ ERROR: toggleGuildPlugin(): ', error)
  }
}

export const updateMetadataGuildPlugin = async (metadata: any, name: string, guildId: string) => {
  try {
    console.log('Updating metadata:', JSON.stringify(metadata, null, 2))

    const result = await db
      .update(guildsPlugins)
      .set({ metadata })
      .where(and(eq(guildsPlugins.name, name), eq(guildsPlugins.owner, guildId)))
      .returning()

    if (!result || result.length === 0) {
      throw new Error('No rows were updated')
    }

    console.log('Update successful. Updated data:', JSON.stringify(result, null, 2))

    return result[0]
  } catch (error) {
    console.error('❌ ERROR: updateMetadataGuildPlugin(): ', error)
    throw error
  }
}

/**
 * Returns an array of plugin names and values for use in a select menu.
 * @returns {Array<{name: string, value: string}>} - An array of plugin names and values.
 */
export const pluginsListNames = (): Array<{ name: string; value: string }> => {
  return Object.entries(pluginsList).reduce((acc, [key]) => {
    return [...acc, { name: key, value: key }]
  }, [])
}

// =+=+=+ Chat GPT Plugin =+=+=+
export const pluginChatGPTSettings = async (
  interaction: CommandInteraction,
  api_key: string,
  org: string,
) => {
  try {
    const currentSettings = await db
      .select()
      .from(guildsPlugins)
      .where(and(eq(guildsPlugins.name, 'chatGtp'), eq(guildsPlugins.owner, interaction.guildId)))
      .limit(1)

    const _metadata = JSON.parse(JSON.stringify(currentSettings[0]?.metadata)) || {}

    await db
      .update(guildsPlugins)
      .set({
        metadata: {
          ..._metadata,
          api_key: encrypt(api_key),
          org: encrypt(org),
        },
      })
      .where(and(eq(guildsPlugins.name, 'chatGtp'), eq(guildsPlugins.owner, interaction.guildId)))

    await interaction.deferReply({
      ephemeral: true,
    })

    return await interaction.editReply({
      content: `The plugin chat-gpt was successfully configured, you can now run the /ask command`,
    })
  } catch (error) {
    console.log('❌ ERROR: pluginChatGPTSettings(): ', error)
  }
}

// =+=+=+ Threads Plugin =+=+=+

/** Updates the metadata for the "threads" plugin in the database for the current guild.
 * @param {PluginsThreadsSettings} options - The options object containing the interaction and metadata.
 */
export const pluginThreadsSettings = async ({ interaction, metadata }: PluginsThreadsSettings) => {
  try {
    const guildsPluginsResult = await db
      .select({ metadata: guildsPlugins.metadata })
      .from(guildsPlugins)
      .where(and(eq(guildsPlugins.name, 'threads'), eq(guildsPlugins.owner, interaction.guildId)))
      .limit(1)

    if (!guildsPluginsResult[0]) {
      throw new Error('Guild plugin not found')
    }

    let updatedMetadata: {
      channelId: string
      title?: string
      autoMessage?: string
      enabled?: boolean
    }[]

    const filteredMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([_, value]) => value !== null),
    ) as PluginsThreadsMetadata

    if (guildsPluginsResult[0]?.metadata) {
      const metadataArray = guildsPluginsResult[0].metadata as PluginsThreadsMetadata[]

      const index = metadataArray.findIndex((item) => item.channelId === metadata.channelId)

      if (index !== -1) {
        metadataArray[index] = { ...metadataArray[index], ...filteredMetadata }

        updatedMetadata = metadataArray
      } else {
        updatedMetadata = [...metadataArray, filteredMetadata]
      }
    } else {
      updatedMetadata = [filteredMetadata]
    }

    // Update the metadata in the database
    await db
      .update(guildsPlugins)
      .set({ metadata: updatedMetadata })
      .where(and(eq(guildsPlugins.name, 'threads'), eq(guildsPlugins.owner, interaction.guildId)))

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
