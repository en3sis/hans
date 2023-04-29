import supabase from '../../lib/supabase'
import { pluginsList } from '../../models/plugins.model'
import { Database } from '../../types/database.types'

export type BotConfig = Database['public']['Tables']['configs']['Row']

/** Adds the bot configuration, this is for admins only.
 * here you can set things like main discord guild
 */
export const insertConfiguration = async () => {
  try {
    const { data, error } = await supabase
      .from('configs')
      .upsert(
        {
          activity_name: !process.env.ISDEV ? 'you' : 'VSC',
          activity_type: 3,
          bot_dev_folder: '/bots-playground',
          bot_guild_id: `${process.env.BOT_GUILD_ID}`,
          bot_id: `${process.env.DISCORD_CLIENT_ID}`,
          created_at: new Date().toISOString(),
          disable_commands: [],
          discord_client_id: `${process.env.DISCORD_CLIENT_ID}`,
          id: 1,
          name: 'Hans',
          notify_channel_id: '1014228732728328202',
          perma_invite: 'https://discord.gg/2tK7PhkZ',
          website: '',
        },
        { onConflict: 'id' },
      )
      .single()

    if (error) {
      throw new Error(error.message)
    }

    console.log(`📥  Initial configuration inserted`)
    return data as unknown as BotConfig
  } catch (error) {
    console.log('❌ ERROR: insertConfiguration(): ', error)
  }
}

export const getBotConfiguration = async (): Promise<BotConfig> => {
  try {
    const { data } = await supabase.from('configs').select('*').single()

    if (data) {
      return data
    } else {
      const config = await insertConfiguration()
      return config
    }
  } catch (error) {
    console.log('❌ ERROR: getBotConfiguration(): ', error)
  }
}

export const insertPlugins = async () => {
  try {
    Object.entries(pluginsList).forEach(async ([key, value]) => {
      const { error } = await supabase.from('plugins').upsert(
        {
          created_at: new Date().toISOString(),
          description: value.description,
          enabled: value.enabled,
          name: key,
          premium: value.premium,
        },
        { onConflict: 'name' },
      )

      if (error) {
        throw new Error(error.message)
      }
    })

    console.log(`📥  Initial plugins list inserted`)
  } catch (error) {
    console.log('❌ ERROR: insertPlugins(): ', error)
  }
}
