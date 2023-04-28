import { Database } from '@/types/database.types'
import supabase from '../../lib/supabase'

export type BotConfig = Database['public']['Tables']['config']['Row']
/**
 * Adds the bot configuration, this is for admins only.
 * here you can set things like main discord guild
 */
export const insertConfiguration = async () => {
  try {
    const { error } = await supabase.from('config').upsert(
      {
        name: 'Hans',
        discord_client_id: `${process.env.DISCORD_CLIENT_ID}`,
        bot_guild_id: `${process.env.BOT_GUILD_ID}`,
        bot_dev_folder: '/bots-playground',
        activity_type: 4,
        activity_name: 'VSC',
        perma_invite: 'https://discord.gg/2tK7PhkZ',
        disable_commands: [],
        notify_channel_id: '',
        website: '',
        bot_id: `${process.env.DISCORD_CLIENT_ID}`,
        id: 1,
      },
      { onConflict: 'id' },
    )

    if (error) {
      throw new Error(error.message)
    }

    console.log(`📥  Initial configuration inserted`)
  } catch (error) {
    console.log('❌ ERROR: insertConfiguration(): ', error)
  }
}

export const getBotConfiguration = async (): Promise<BotConfig> => {
  try {
    const config = (await supabase.from('config').select('*').single()) as unknown as BotConfig

    if (config) {
      return config
    } else {
      await insertConfiguration()
    }
  } catch (error) {
    console.log('❌ ERROR: getBotConfiguration(): ', error)
  }
}
