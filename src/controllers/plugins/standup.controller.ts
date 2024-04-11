import { CommandInteraction, TextChannel } from 'discord.js'
import * as cron from 'cron'
import { StandupScheduleMetadata } from '../../types/plugins'
import { updateMetadataGuildPlugin } from '../bot/plugins.controller'
import supabase from '../../libs/supabase'
import { scheduledTasks } from '../tasks/cron-jobs'
import { Hans } from '../..'

// TODO: @en3sis: Allow multiples standup schedules
export const standupPluginController = async (
  interaction: CommandInteraction,
  metadata: StandupScheduleMetadata,
) => {
  try {
    const { channelId, expression, role } = metadata

    const _expression = `0 ${expression} * * 1-5`
    const isValidExpression = RegExp(/^[0-9,]+$/).test(expression)

    if (isValidExpression) {
      await updateMetadataGuildPlugin(
        { ...metadata, expression: _expression },
        'standup',
        interaction.guildId,
      )

      await interaction.editReply({
        content: `Enabled Standup Notifications in <#${channelId}> from **Monday to Friday** at **${expression}h** and mentioning the role ${role} \n\n You can disable it by running **/plugins toggle standup false**`,
      })
    } else {
      await interaction.editReply({
        content: `Invalid cron expression: ${expression}, please provide a 24h format (eg: 9, 12, 15)`,
      })
    }
  } catch (error) {
    console.error('❌ ERROR: standupPluginController(): ', error)
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

      await registerStandupSchedule(
        standupGuildPlugin.owner,
        standupGuildPlugin.metadata as StandupScheduleMetadata,
      )
    })
  } catch (error) {
    console.error('❌ ERROR: registerStandupSchedule(): ', error)
  }
}

export const registerStandupSchedule = async (owner: string, metadata: StandupScheduleMetadata) => {
  try {
    const { channelId, expression, role, message } = metadata

    const job = new cron.CronJob(expression, () => {
      const channel = Hans.channels.cache.get(channelId) as TextChannel

      if (channel) {
        // INFO: Current date in format Tuesday, 1st of December 2020
        const currentDate = new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        // INFO: Opens a tread on the messaged sent to the channel.
        channel.send(`📆 Standup: **${currentDate}** | ${role ?? ''}`).then((msg) => {
          msg.startThread({
            name: `${message ?? '✍️  Please write down your standup'}`,
            autoArchiveDuration: 1440,
          })
        })
      }
    })

    job.start()
    // TODO: @en3sis: Expand to more than one job
    scheduledTasks[`${owner}#standup`] = job
    if (!!process.env.ISDEV) {
      console.debug(`✅ Standup schedule registered count:`, Object.keys(scheduledTasks).length)
    }
  } catch (error) {
    console.error('❌ ERROR: registerStandupSchedule(): ', error)
  }
}
