import { CommandInteraction } from 'discord.js'
import supabase from '../../libs/supabase'
import { initialGuildPluginState, pluginsList } from '../../models/plugins.model'
import {
  GuildPluginData,
  PluginsThreadsMetadata,
  PluginsThreadsSettings,
} from '../../types/plugins'
import { encrypt } from '../../utils/crypto'
import { GuildPlugin } from './guilds.controller'

/**
 * Inserts a new row in the guilds_plugins table for each plugin in the plugins table.
 * @param {string} guild_id - The ID of the guild to insert the plugins for.
 * @returns {Promise<void>} - A Promise that resolves when the plugins have been inserted.
 */
export const insertGuildPlugin = async (guild_id: string) => {
  try {
    const plugins = await supabase.from('plugins').select('*')

    const guildPlugins: Omit<GuildPlugin, 'id' | 'metadata'>[] = plugins.data.map((plugin) => ({
      owner: guild_id,
      enabled: initialGuildPluginState[plugin.name]?.default_enabled ?? plugin.enabled,
      name: plugin.name,
      created_at: new Date().toISOString(),
    }))

    // check if a row with the same plugin name and guild_id exists
    const { data: existingGuildPlugins } = await supabase
      .from('guilds_plugins')
      .select('*')
      .in(
        'name',
        guildPlugins.map((gp) => gp.name),
      )
      .eq('owner', guild_id)

    const newGuildPlugins = guildPlugins.filter((gp) => {
      // check if there is no existing guild-plugin with the same name and guild_id
      const existingPlugin = existingGuildPlugins.find(
        (egp) => egp.name === gp.name && egp.owner === guild_id,
      )
      return !existingPlugin
    })

    if (newGuildPlugins.length > 0) {
      await supabase.from('guilds_plugins').upsert(newGuildPlugins)
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
    const { data, error } = await supabase
      .from('guilds')
      .select('*, guilds_plugins(*, plugins(enabled, description, premium))')
      .eq('guild_id', guild_id)

    if (error) throw error

    return data
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
    const { data: guildPluginResult } = await supabase
      .from('guilds')
      .select('*, guilds_plugins(*, plugins(enabled, description, premium, name))')
      .eq('guild_id', guild_id)
      .single()

    if (!guildPluginResult) return

    const guildPlugin = guildPluginResult?.guilds_plugins.find(
      (ele: GuildPlugin) => ele.name === pluginName,
    )

    const botPlugin: Record<string, any> = guildPlugin?.plugins

    if (guildPlugin && guildPlugin.enabled && botPlugin.enabled) {
      return {
        enabled: guildPlugin?.enabled || false,
        metadata: JSON.parse(JSON.stringify(guildPlugin?.metadata)),
        data: guildPlugin,
      }
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
    await supabase
      .from('guilds_plugins')
      .update({ enabled: toggle })
      .eq('name', name)
      .eq('owner', interaction.guildId)
    // .or(`name.eq.guildMemberAdd, name.eq.guildMemberRemove`)

    await interaction.editReply({
      content: `The plugin ${name} was successfully ${toggle ? 'enabled' : 'disabled'}`,
    })
  } catch (error) {
    console.log('❌ ERROR: toggleGuildPlugin(): ', error)
  }
}

/**
 * Returns an array of plugin names and values for use in a select menu.
 * @returns {Array<{name: string, value: string}>} - An array of plugin names and values.
 */
export const pluginsListNames = () => {
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
    const { data: currentSettings } = await supabase
      .from('guilds_plugins')
      .select('*')
      .eq('name', 'chatGtp')
      .eq('owner', interaction.guildId)
      .single()

    const _metadata = JSON.parse(JSON.stringify(currentSettings?.metadata)) || {}

    const { error } = await supabase
      .from('guilds_plugins')
      .update({
        metadata: {
          ..._metadata,
          api_key: encrypt(api_key),
          org: encrypt(org),
        },
      })
      .eq('name', 'chatGtp')
      .eq('owner', interaction.guildId)

    if (error) throw error

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

/**
 * Updates the metadata for the "threads" plugin in the database for the current guild.
 * @param {PluginsThreadsSettings} options - The options object containing the interaction and metadata.
 */

export const pluginThreadsSettings = async ({ interaction, metadata }: PluginsThreadsSettings) => {
  try {
    const { data: guildsPlugins, error } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'threads')
      .eq('owner', interaction.guildId)
      .single()

    if (error) throw error

    let updatedMetadata: {
      channelId: string
      title?: string
      autoMessage?: string
      enabled?: boolean
    }[]

    const filteredMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([_, value]) => value !== null),
    ) as PluginsThreadsMetadata

    if (guildsPlugins?.metadata) {
      const metadataArray = guildsPlugins.metadata as PluginsThreadsMetadata[]

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
    const { error: updateError } = await supabase
      .from('guilds_plugins')
      .update({ metadata: updatedMetadata })
      .eq('name', 'threads')
      .eq('owner', interaction.guildId)

    if (updateError) throw updateError

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
