import { ActivityType } from 'discord.js'
import { Hans } from '../..'
import supabase from '../../libs/supabase'
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
          bot_dev_folder: '/bots-playground',
          bot_guild_id: `${process.env.BOT_GUILD_ID}`,
          bot_id: `${process.env.DISCORD_CLIENT_ID}`,
          created_at: new Date().toISOString(),
          discord_client_id: `${process.env.DISCORD_CLIENT_ID}`,
          id: 1,
          monitoring_channel_id: '1105791856207462438', // Sends errors to the monitoring channel, useful to debug in production
          name: 'Hans',
          notify_channel_id: '905157473671975002', // Send notifications when the bot is online to this channel.
          perma_invite: 'https://discord.com/invite/sMmbbSefwH',
          website: 'https://github.com/en3sis/hans',
        },
        { onConflict: 'id' },
      )
      .single()

    if (error) {
      throw Error(error.message)
    }

    console.log(`📥 Initial configuration inserted/updated`)
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
    const { data: existingPlugins } = await supabase.from('plugins').select('*')

    const upsertPromises = Object.entries(pluginsList).map(async ([key, value]) => {
      const existingPlugin = existingPlugins.find((plugin) => plugin.name === key)

      // check if the existing plugin data doesn't match the values in pluginsList
      if (
        existingPlugin &&
        (existingPlugin.description !== value.description ||
          existingPlugin.enabled !== value.enabled ||
          existingPlugin.premium !== value.premium)
      ) {
        const { error } = await supabase.from('plugins').upsert(
          {
            id: existingPlugin.id,
            created_at: existingPlugin.created_at,
            description: value.description,
            enabled: value.enabled,
            name: key,
            category: value.category,
            premium: value.premium,
          },
          { onConflict: 'name' },
        )

        if (error) {
          throw Error(error.message)
        }
      }
      // else create a new plugin row
      else {
        const { error } = await supabase.from('plugins').upsert(
          {
            created_at: new Date().toISOString(),
            description: value.description,
            enabled: value.enabled,
            category: value.category,
            name: key,
            premium: value.premium,
          },
          { onConflict: 'name' },
        )

        if (error) {
          throw Error(error.message)
        }
      }
    })

    await Promise.all(upsertPromises)

    console.log(`💠 Initial ${upsertPromises.length} plugins list inserted/updated`)
  } catch (error) {
    console.log('❌ ERROR: insertPlugins(): ', error)
  }
}

export const setPresence = async (type: ActivityType, text: string): Promise<void> => {
  Hans.user.setPresence({
    activities: [
      {
        type: type || Number(3),
        name: text || 'you',
      },
    ],
  })
}
