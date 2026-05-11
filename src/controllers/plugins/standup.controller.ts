import * as cron from 'cron'
import { TextChannel } from 'discord.js'
import { eq } from 'drizzle-orm'
import { Hans } from '../..'
import { db } from '../../db/client'
import { guildsPlugins } from '../../db/schema'
import { StandupScheduleMetadata } from '../../types/plugins'
import { scheduledTasks } from '../tasks/cron-jobs'

export const registerStandupSchedules = async (
  guildId: string,
  schedules: StandupScheduleMetadata[],
) => {
  try {
    Object.keys(scheduledTasks).forEach((key) => {
      if (key.startsWith(`${guildId}#standup`)) {
        scheduledTasks[key].stop()
        delete scheduledTasks[key]
      }
    })

    schedules.forEach((schedule, index) => {
      const { channelId, expression, role, message } = schedule

      const job = new cron.CronJob(expression, () => {
        const channel = Hans.channels.cache.get(channelId) as TextChannel
        if (channel) {
          const currentDate = new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          channel.send(`📆 Standup: **${currentDate}** | ${role ?? ''}`).then((msg) => {
            msg.startThread({
              name: `${message.length ? message : '✍️  Please write down your standup'}`,
              autoArchiveDuration: 1440,
            })
          })
        }
      })

      job.start()
      scheduledTasks[`${guildId}#standup#${index}`] = job
    })

    if (process.env.ISDEV) {
      console.debug(`✅ Standup schedules registered for guild ${guildId}:`, schedules.length)
    }
  } catch (error) {
    console.error(`❌ ERROR: registerStandupSchedules for guild ${guildId}:`, error)
  }
}

export const initStadupsSchedules = async () => {
  try {
    const rows = await db.query.guildsPlugins.findMany({
      where: eq(guildsPlugins.name, 'standup'),
    })
    for (const row of rows) {
      if (!row.metadata || !row.enabled) continue
      await registerStandupSchedules(
        row.owner,
        row.metadata as unknown as StandupScheduleMetadata[],
      )
    }
  } catch (error) {
    console.error('❌ ERROR: initStadupsSchedules(): ', error)
  }
}
