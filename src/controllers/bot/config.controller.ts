import { ActivityType } from 'discord.js'
import { Hans } from '../..'
import { db } from '../../db/client'
import { Config, configs, plugins } from '../../db/schema'
import { pluginsList } from '../../models/plugins.model'

export type BotConfig = Config

export const insertConfiguration = async (): Promise<BotConfig | undefined> => {
  try {
    const row = {
      id: 1,
      bot_id: `${process.env.DISCORD_CLIENT_ID}`,
      bot_guild_id: `${process.env.BOT_GUILD_ID}`,
      bot_dev_folder: '/bots-playground',
      created_at: new Date().toISOString(),
      discord_client_id: `${process.env.DISCORD_CLIENT_ID}`,
      name: 'Hans',
      notify_channel_id: '905157473671975002',
      perma_invite: 'https://discord.com/invite/sMmbbSefwH',
      website: 'https://github.com/en3sis/hans',
      monitoring_channel_id: '1105791856207462438',
    }

    await db
      .insert(configs)
      .values(row)
      .onConflictDoUpdate({
        target: configs.id,
        set: {
          bot_id: row.bot_id,
          bot_guild_id: row.bot_guild_id,
          bot_dev_folder: row.bot_dev_folder,
          discord_client_id: row.discord_client_id,
          name: row.name,
          notify_channel_id: row.notify_channel_id,
          perma_invite: row.perma_invite,
          website: row.website,
          monitoring_channel_id: row.monitoring_channel_id,
        },
      })

    console.log(`📥 Initial configuration inserted/updated`)
    return getBotConfiguration()
  } catch (error) {
    console.log('❌ ERROR: insertConfiguration(): ', error)
  }
}

export const getBotConfiguration = async (): Promise<BotConfig | undefined> => {
  try {
    const existing = await db.query.configs.findFirst()
    if (existing) return existing
    return await insertConfiguration()
  } catch (error) {
    console.log('❌ ERROR: getBotConfiguration(): ', error)
  }
}

export const insertPlugins = async () => {
  try {
    for (const [name, value] of Object.entries(pluginsList)) {
      await db
        .insert(plugins)
        .values({
          name,
          description: value.description,
          enabled: value.enabled ?? false,
          premium: value.premium ?? false,
          category: value.category ?? 'miscellaneous',
        })
        .onConflictDoUpdate({
          target: plugins.name,
          set: {
            description: value.description,
            enabled: value.enabled ?? false,
            premium: value.premium ?? false,
            category: value.category ?? 'miscellaneous',
          },
        })
    }
    console.log(`💠 Initial ${Object.keys(pluginsList).length} plugins list inserted/updated`)
  } catch (error) {
    console.log('❌ ERROR: insertPlugins(): ', error)
  }
}

export const setPresence = async (type: ActivityType, text: string): Promise<void> => {
  Hans.user?.setPresence({
    activities: [
      {
        type: type || Number(3),
        name: text || 'you',
      },
    ],
  })
}
