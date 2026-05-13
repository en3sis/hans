import * as cron from 'cron'
import { TextChannel } from 'discord.js'
import { eq } from 'drizzle-orm'
import { Hans } from '../..'
import { db } from '../../db/client'
import { guildsPlugins } from '../../db/schema'
import { StandupScheduleMetadata } from '../../types/plugins'
import { ERROR_COLOR } from '../../utils/colors'
import { reportErrorToMonitoring } from '../../utils/monitoring'
import { scheduledTasks } from '../tasks/cron-jobs'

/** True when the schedule has everything it needs to run. */
const isComplete = (s: StandupScheduleMetadata): boolean =>
  typeof s.expression === 'string' &&
  s.expression.length > 0 &&
  typeof s.channelId === 'string' &&
  s.channelId.length > 0

export const registerStandupSchedules = async (
  guildId: string,
  schedules: StandupScheduleMetadata[],
): Promise<void> => {
  // Clear any previously registered jobs for this guild — never throws.
  for (const key of Object.keys(scheduledTasks)) {
    if (key.startsWith(`${guildId}#standup`)) {
      try {
        scheduledTasks[key].stop()
      } catch {
        /* ignore */
      }
      delete scheduledTasks[key]
    }
  }

  schedules.forEach((schedule, index) => {
    if (!isComplete(schedule)) return // incomplete draft — silently skip

    const { channelId, expression, role, message } = schedule
    try {
      const job = new cron.CronJob(expression!, () => {
        const channel = Hans.channels.cache.get(channelId!) as TextChannel | undefined
        if (!channel) return
        const currentDate = new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        channel
          .send(`📆 Standup: **${currentDate}** | ${role ?? ''}`)
          .then((msg) =>
            msg.startThread({
              name: message && message.length > 0 ? message : '✍️  Please write down your standup',
              autoArchiveDuration: 1440,
            }),
          )
          .catch((err) =>
            console.error(`❌ standup cron tick failed for ${guildId}#${index}:`, err),
          )
      })

      job.start()
      scheduledTasks[`${guildId}#standup#${index}`] = job
    } catch (error) {
      // One bad schedule shouldn't poison the rest. Notify monitoring so the
      // admin sees it without killing the app.
      const message =
        error instanceof Error ? error.message : 'Unknown standup schedule error'
      console.error(
        `❌ registerStandupSchedules[${guildId}#${index}] — invalid schedule:`,
        error,
      )
      reportErrorToMonitoring({
        embeds: {
          title: `⚠️ Invalid standup schedule`,
          description: `Guild \`${guildId}\` standup item #${index} could not be scheduled and was skipped.\n\`\`\`\n${message}\n\`\`\``,
          color: ERROR_COLOR,
        },
      }).catch(() => {
        /* monitoring is best-effort */
      })
    }
  })

  if (process.env.ISDEV) {
    const registered = schedules.filter(isComplete).length
    console.debug(`✅ Standup: registered ${registered}/${schedules.length} for guild ${guildId}`)
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
