import supabase from '../../libs/supabase'
import { GuildPlugin } from './guilds.controller'

export const insertGuildPlugin = async (guild_id: string) => {
  try {
    const plugins = await supabase.from('plugins').select('*')

    const guildPlugins: Omit<GuildPlugin, 'id'>[] = plugins.data.map((plugin) => ({
      owner: guild_id,
      enabled: plugin.enabled,
      metadata: {},
      name: plugin.name,
      created_at: new Date().toISOString(),
    }))

    // check if a row with the same plugin name and guild_id exists
    const { data: existingGuildPlugins } = await supabase
      .from('guilds-plugins')
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
      await supabase.from('guilds-plugins').upsert(newGuildPlugins)
    }
  } catch (error) {
    console.error('❌ ERROR: insertGuildPlugin', error)
  }
}

export const findGuildPlugins = async (guild_id: string) => {
  try {
    const { data, error } = await supabase
      .from('guilds')
      .select('*, guilds-plugins(*, plugins(enabled, description, premium))')
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
  data: GuildPlugin | object
}

export const resolveGuildPlugins = async (
  guild_id: string,
  pluginName: string,
): Promise<GuildPluginData> => {
  try {
    const { data: guildPlugin } = await supabase
      .from('guilds')
      .select('*, guilds-plugins(*, plugins(enabled, description, premium))')
      .eq('guild_id', guild_id)
      .single()

    const matchingPlugin = guildPlugin?.['guilds-plugins'].find(
      (ele: GuildPlugin) => ele.name === pluginName,
    )

    if (matchingPlugin && matchingPlugin.plugins.enabled && matchingPlugin.enabled) {
      return {
        enabled: matchingPlugin.enabled || false,
        metadata: JSON.parse(JSON.stringify(matchingPlugin.metadata)),
        data: matchingPlugin,
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
    return {
      enabled: false,
      metadata: {},
      data: {},
    }
  }
}
