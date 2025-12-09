import { ActivityType } from 'discord.js'
import { Hans } from '../..'
import { db } from '../../libs/drizzle'
import { configs, plugins } from '../../db/schema'
import { pluginsList } from '../../models/plugins.model'

export type BotConfig = typeof configs.$inferSelect

/** Adds the bot configuration, this is for admins only.
 * here you can set things like main discord guild
 */
export const insertConfiguration = async () => {
  try {
    const configData = {
      botDevFolder: '/bots-playground',
      botGuildId: `${process.env.BOT_GUILD_ID}`,
      botId: `${process.env.DISCORD_CLIENT_ID}`,
      createdAt: new Date().toISOString(),
      discordClientId: `${process.env.DISCORD_CLIENT_ID}`,
      id: 1,
      monitoringChannelId: '1105791856207462438',
      name: 'Hans',
      notifyChannelId: '905157473671975002',
      permaInvite: 'https://discord.com/invite/sMmbbSefwH',
      website: 'https://github.com/en3sis/hans',
    }

    const result = await db
      .insert(configs)
      .values(configData)
      .onConflictDoUpdate({
        target: configs.id,
        set: configData,
      })
      .returning()

    console.log(`📥 Initial configuration inserted/updated`)
    return result[0] as BotConfig
  } catch (error) {
    console.log('❌ ERROR: insertConfiguration(): ', error)
  }
}

export const getBotConfiguration = async (): Promise<BotConfig> => {
  try {
    const result = await db.select().from(configs).limit(1)

    if (result[0]) {
      return result[0]
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
    const existingPlugins = await db.select().from(plugins)

    const upsertPromises = Object.entries(pluginsList).map(async ([key, value]) => {
      const existingPlugin = existingPlugins.find((plugin) => plugin.name === key)

      if (
        existingPlugin &&
        (existingPlugin.description !== value.description ||
          existingPlugin.enabled !== value.enabled ||
          existingPlugin.premium !== value.premium)
      ) {
        await db
          .insert(plugins)
          .values({
            id: existingPlugin.id,
            createdAt: existingPlugin.createdAt,
            description: value.description,
            enabled: value.enabled,
            name: key,
            category: value.category,
            premium: value.premium,
          })
          .onConflictDoUpdate({
            target: plugins.name,
            set: {
              description: value.description,
              enabled: value.enabled,
              category: value.category,
              premium: value.premium,
            },
          })
      } else if (!existingPlugin) {
        await db
          .insert(plugins)
          .values({
            createdAt: new Date().toISOString(),
            description: value.description,
            enabled: value.enabled,
            category: value.category,
            name: key,
            premium: value.premium,
          })
          .onConflictDoNothing()
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
