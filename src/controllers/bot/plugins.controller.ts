import { CommandInteraction } from 'discord.js'
import supabase from '../../libs/supabase'
import { pluginsList } from '../../models/plugins.model'
import { encrypt } from '../../utils/crypto'
import { GuildPlugin } from './guilds.controller'

export const insertGuildPlugin = async (guild_id: string) => {
  try {
    const plugins = await supabase.from('plugins').select('*')

    const guildPlugins: Omit<GuildPlugin, 'id' | 'metadata'>[] = plugins.data.map((plugin) => ({
      owner: guild_id,
      enabled: plugin.enabled,
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

export type GuildPluginData = {
  enabled: boolean
  metadata: any
  data: GuildPlugin | any
}

/**
 *
 * @param guild_id
 * @param pluginName
 * @returns {enabled: false, metadata: {}, data: {}
 */
export const resolveGuildPlugins = async (
  guild_id: string,
  pluginName: string,
): Promise<GuildPluginData> => {
  try {
    const { data: guildPlugin } = await supabase
      .from('guilds')
      .select('*, guilds_plugins(*, plugins(enabled, description, premium))')
      .eq('guild_id', guild_id)
      .single()

    // INFO: Not sure why this fails below, `guilds_plugins` is an array but the array methods wont show.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const matchingPlugin = guildPlugin.guilds_plugins.find(
      (ele: GuildPlugin) => ele.name === pluginName,
    )

    if (matchingPlugin && matchingPlugin.plugins.enabled && matchingPlugin.enabled) {
      return {
        enabled: matchingPlugin.enabled || false,
        metadata: JSON.parse(JSON.stringify(matchingPlugin.metadata)),
        data: guildPlugin,
      }
    } else {
      return {
        enabled: false,
        metadata: {},
        data: {},
      }
    }
  } catch (error) {
    console.error('❌ ERROR: resolveGuildPlugin', error)
  }
}

export const toggleGuildPlugin = async (
  interaction: CommandInteraction,
  name: string,
  toggle: boolean,
) => {
  try {
    const { data, error } = await supabase
      .from('guilds_plugins')
      .update({ enabled: toggle })
      .eq('name', name)
      .eq('owner', interaction.guildId)
    // .or(`name.eq.guildMemberAdd, name.eq.guildMemberRemove`)

    if (error) throw error

    await interaction.editReply({
      content: `The plugin ${name} was successfully ${toggle ? 'enabled' : 'disabled'}`,
    })

    return data
  } catch (error) {
    console.log('❌ ERROR: toggleGuildPlugin(): ', error)
  }
}

export const pluginsListNames = () => {
  return Object.entries(pluginsList).reduce((acc, [key]) => {
    return [...acc, { name: key, value: key }]
  }, [])
}

// ====================
// Chat GPT Plugin
// ====================
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

// ====================
// Threads Plugin
// ====================
export type PluginsThreadsMetadata = {
  channelId: string
  title?: string | null
  autoMessage?: string | null
  enabled?: boolean
}

export type PluginsThreadsSettings = {
  interaction: CommandInteraction
  metadata: PluginsThreadsMetadata
}

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
