import { CommandInteraction, TextChannel } from 'discord.js'
import * as cron from 'cron'
import { StandupScheduleMetadata } from '../../types/plugins'
import { updateMetadataGuildPlugin } from '../bot/plugins.controller'
import supabase from '../../libs/supabase'
import { scheduledTasks } from '../tasks/cron-jobs'
import { Hans } from '../..'
import { deleteFromCache } from '../../libs/node-cache'

export const standupPluginController = async (
  interaction: CommandInteraction,
  newSchedule: StandupScheduleMetadata,
) => {
  try {
    // Fetch current plugin data

    // Force to update the cache from the database
    deleteFromCache(`guildPlugins:${interaction.guildId}:standup`)
    const guildPlugin = await Hans.guildPluginSettings(interaction.guildId, 'standup')
    const currentSchedules: StandupScheduleMetadata[] = guildPlugin?.metadata || []

    // Check if a schedule for this channel already exists
    const existingScheduleIndex = currentSchedules.findIndex(
      (schedule) => schedule.channelId === newSchedule.channelId,
    )

    if (existingScheduleIndex !== -1) {
      // Update existing schedule
      currentSchedules[existingScheduleIndex] = newSchedule
    } else {
      // Add new schedule
      currentSchedules.push(newSchedule)
    }

    const updatedMetadata = currentSchedules.map((schedule) => {
      const { channelId, expression, role } = schedule
      const _expression = expression.startsWith('0 ') ? expression : `0 ${expression} * * 1-5`
      const isValidExpression = RegExp(/^0 [0-9,]+ \* \* 1-5$/).test(_expression)

      if (!isValidExpression) {
        throw new Error(
          `Invalid cron expression: ${expression}, please provide a 24h format (eg: 9, 12, 15)`,
        )
      }

      return { ...schedule, expression: _expression }
    })

    await updateMetadataGuildPlugin(updatedMetadata, 'standup', interaction.guildId)

    await registerStandupSchedules(interaction.guildId, updatedMetadata)

    const scheduleInfo = updatedMetadata
      .map(
        (schedule) =>
          `<#${schedule.channelId}> at **${schedule.expression.split(' ')[1]}h** mentioning ${schedule.role || 'no role'}`,
      )
      .join('\n')

    await interaction.editReply({
      content: `Updated Standup Notifications:\n${scheduleInfo}\n\nYou can disable it by running **/plugins toggle standup false**`,
    })
  } catch (error) {
    console.error('❌ ERROR: standupPluginController(): ', error)
    await interaction.editReply({
      content: `An error occurred: ${error.message}`,
    })
  }
}

export const registerStandupSchedules = async (
  guildId: string,
  schedules: StandupScheduleMetadata[],
) => {
  try {
    // Stop existing schedules for this guild
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
    const { error, data } = await supabase
      .from('guilds_plugins')
      .select('owner, metadata, enabled')
      .eq('name', 'standup')

    if (error) throw error

    data.forEach(async (standupGuildPlugin) => {
      if (!standupGuildPlugin.metadata || !standupGuildPlugin.enabled) return

      await registerStandupSchedules(
        standupGuildPlugin.owner,
        standupGuildPlugin.metadata as StandupScheduleMetadata[],
      )
    })
  } catch (error) {
    console.error('❌ ERROR: initStadupsSchedules(): ', error)
  }
}
