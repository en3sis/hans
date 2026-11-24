import { ActivityType } from 'discord.js'
import { notInArray } from 'drizzle-orm'
import { Hans } from '../..'
import { db } from '../../db/client'
import { Config, configs, guildsPlugins, plugins } from '../../db/schema'
import { pluginsList } from '../../models/plugins.model'
import { log } from '../../utils/log'

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

    log.info(`📥 Initial configuration inserted/updated`)
    return getBotConfiguration()
  } catch (error) {
    log.info('❌ ERROR: insertConfiguration(): ', error)
  }
}

export const getBotConfiguration = async (): Promise<BotConfig | undefined> => {
  try {
    const existing = await db.query.configs.findFirst()
    if (existing) return existing
    return await insertConfiguration()
  } catch (error) {
    log.info('❌ ERROR: getBotConfiguration(): ', error)
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
    log.info(`💠 Initial ${Object.keys(pluginsList).length} plugins list inserted/updated`)

    const registered = Object.keys(pluginsList)
    const prunedRows = await db
      .delete(guildsPlugins)
      .where(notInArray(guildsPlugins.name, registered))
      .returning({ id: guildsPlugins.id })
    const prunedPlugins = await db
      .delete(plugins)
      .where(notInArray(plugins.name, registered))
      .returning({ name: plugins.name })
    if (prunedPlugins.length > 0 || prunedRows.length > 0) {
      log.info(
        `🧹 Pruned ${prunedPlugins.length} removed plugin(s) and ${prunedRows.length} guild row(s): ${prunedPlugins.map((p) => p.name).join(', ')}`,
      )
    }
  } catch (error) {
    log.info('❌ ERROR: insertPlugins(): ', error)
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
