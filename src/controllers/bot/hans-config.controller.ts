import supabase from '../../lib/supabase'
import { BotSettingsT } from '../../types'

/**
 * Adds the bot configuration, this is for admins only.
 * here you can set things like main discord guild
 */
export const insertConfiguration = async () => {
  try {
    // Initial configuration for the bot to be inserted in the database
    const config: Omit<BotSettingsT, 'id'> = {
      name: 'Hans',
      discord_client_id: `${process.env.DISCORD_CLIENT_ID}`,
      notify_channel_id: '1014228732728328202',
      bot_dev_folder: '/bots-playground',
      bot_guild_id: `${process.env.BOT_GUILD_ID}`,
      website: '',
      perma_invite: 'https://discord.gg/2tK7PhkZ',
      disable_commands: [],
      bot_id: `${process.env.BOT_USER_ID}`,
      activity_type: 3,
      activity_name: !process.env.ISDEV ? 'you' : 'VSC',
      created_at: new Date().toISOString(),
    }

    const { statusText, error } = await supabase.from('config').upsert(config)

    if (error) throw error

    console.info(`📥  Initial configuration inserted: ${statusText}`)
  } catch (error) {
    console.log('❌ ERROR: insertConfiguration(): ', error)
  }
}
