import * as cron from 'cron'
import { CommandInteraction, TextChannel } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { Hans } from '../..'
import { db } from '../../db/client'
import { guildsPlugins } from '../../db/schema'
import { StandupScheduleMetadata } from '../../types/plugins'
import { updateMetadataGuildPlugin } from '../bot/plugins.controller'
import { scheduledTasks } from '../tasks/cron-jobs'

export const standupPluginController = async (
  interaction: CommandInteraction,
  newSchedule: StandupScheduleMetadata,
) => {
  try {
    const current = await db.query.guildsPlugins.findFirst({
      where: and(
        eq(guildsPlugins.owner, interaction.guildId!),
        eq(guildsPlugins.name, 'standup'),
      ),
    })

    let currentSchedules: StandupScheduleMetadata[] = []
    if (Array.isArray(current?.metadata)) {
      currentSchedules = current.metadata as unknown as StandupScheduleMetadata[]
    }

    const existingIdx = currentSchedules.findIndex((s) => s.channelId === newSchedule.channelId)
    if (existingIdx !== -1) {
      currentSchedules[existingIdx] = newSchedule
    } else {
      currentSchedules.push(newSchedule)
    }

    const updatedMetadata = currentSchedules.map((schedule) => {
      const { expression } = schedule
      const _expression = expression.startsWith('0 ') ? expression : `0 ${expression} * * 1-5`
      const isValidExpression = RegExp(/^0 [0-9,]+ \* \* 1-5$/).test(_expression)

      if (!isValidExpression) {
        throw new Error(
          `Invalid cron expression: ${expression}, please provide a 24h format (eg: 9, 12, 15)`,
        )
      }

      return { ...schedule, expression: _expression }
    })

    try {
      await updateMetadataGuildPlugin(updatedMetadata, 'standup', interaction.guildId!)
      await registerStandupSchedules(interaction.guildId!, updatedMetadata)

      const scheduleInfo = updatedMetadata
        .map(
          (schedule) =>
            `<#${schedule.channelId}> at **${schedule.expression.split(' ')[1]}h** mentioning ${schedule.role || 'no role'}`,
        )
        .join('\n')

      await interaction.editReply({
        content: `Updated Standup Notifications:\n${scheduleInfo}\n\nYou can disable it by running /plugins toggle standup false`,
      })
    } catch (updateError) {
      console.error('Error updating metadata:', updateError)
      throw new Error('Failed to update standup schedules. Please try again.')
    }
  } catch (error) {
    console.error('❌ ERROR: standupPluginController(): ', error)
    await interaction.editReply({ content: `An error occurred: ${error.message}` })
  }
}

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
