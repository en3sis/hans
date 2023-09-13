import formatDistance from 'date-fns/formatDistance'
import { ChatInputCommandInteraction, Colors } from 'discord.js'
import { TIMEZONES_LIST } from '../../data/timezones'
import supabase from '../../libs/supabase'
import { extractHours, getTimeZonesTime } from '../../utils/dates'
import { TIME_ZONES_REGEX } from '../../utils/regex'

export const timezonesController = async (interaction: ChatInputCommandInteraction) => {
  try {
    const command = interaction.options.getSubcommand()

    if (command === 'set') {
      const timezone = interaction.options.getString('zone', true).trim()

      if (!TIME_ZONES_REGEX.test(timezone) || !TIMEZONES_LIST.includes(timezone)) {
        return interaction.editReply({
          embeds: [
            {
              title: '❗️ Invalid timezone',
              description: `The timezone **${timezone}** you provided is invalid. Please use the following format: **America/New_York**. You can find a list of valid timezones [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)`,
              color: Colors.Red,
            },
          ],
        })
      }

      // Check if user already has a timezone set
      const { data } = await supabase
        .from('users_settings')
        .select('*')
        .eq('user_id', interaction.user.id)
        .eq('type', 'timezone')
        .single()

      // If not, insert it, otherwise update it
      if (!data) {
        await supabase
          .from('users_settings')
          .insert({
            user_id: interaction.user.id,
            type: 'timezone',
            metadata: { timezone },
          })
          .select()
      } else {
        await supabase
          .from('users_settings')
          .update({
            metadata: { timezone },
          })
          .eq('user_id', interaction.user.id)
          .eq('type', 'timezone')
      }

      interaction.editReply({
        embeds: [
          {
            title: 'Timezone set',
            description: `Your timezone has been set to **${timezone}**`,
          },
        ],
      })
    } else if (command === 'unset') {
      // Deletes the user's timezone configuration from the database
      await supabase
        .from('users_settings')
        .delete()
        .eq('user_id', interaction.user.id)
        .eq('type', 'timezone')

      await interaction.editReply({ content: 'Your timezone has been unset.' })
    } else if (command === 'diff') {
      // Get the target & author user
      const targetUser = interaction.options.getUser('user', true)
      const authorUser = interaction.user

      // Check if both users have a timezone set
      const { data } = await supabase
        .from('users_settings')
        .select('*')
        .in('user_id', [targetUser.id, authorUser.id])

      const targetUserData = data.filter((d) => d.user_id === targetUser.id)[0]
      const authorUserData = data.filter((d) => d.user_id === authorUser.id)[0]

      // If both users have a timezone set, compare them
      if (data[0] && data[1]) {
        const targetUserTimezone = (targetUserData.metadata as { timezone?: string })?.timezone
        const authorTimezone = (authorUserData.metadata as { timezone?: string })?.timezone

        const getTimeZones = getTimeZonesTime(targetUserTimezone, authorTimezone)

        const timeDifference = formatDistance(
          new Date(getTimeZones.authorLocalTime),
          new Date(getTimeZones.targetLocalTime),
        )

        const targetTimezoneIsInFuture =
          new Date(getTimeZones.targetLocalTime) > new Date(getTimeZones.authorLocalTime)

        return interaction.editReply({
          embeds: [
            {
              title: '🕑 Timezone difference',
              description: `**${
                targetUser.displayName ?? targetUser.username
              }** is currently **${timeDifference} ${
                targetTimezoneIsInFuture ? 'ahead' : 'behind'
              }** with his local time being **${extractHours(
                getTimeZones.targetLocalTime,
              )}** and yours being **${extractHours(getTimeZones.authorLocalTime)}**`,
              fields: [
                {
                  name: 'Your timezone',
                  value: `${authorTimezone} (${extractHours(getTimeZones.authorLocalTime)})`,
                  inline: true,
                },
                {
                  name: `${targetUser.displayName ?? targetUser.username}'s timezone`,
                  value: `${targetUserTimezone} (${extractHours(getTimeZones.targetLocalTime)})`,
                  inline: true,
                },
              ],
              color: Colors.Green,
            },
          ],
        })
      } else {
        return interaction.editReply({
          embeds: [
            {
              title: '❗️ Timezone not set',
              description: `${targetUser.username} has not set their timezone yet.`,
              color: Colors.Red,
            },
          ],
        })
      }
    }
  } catch (error) {
    console.log('💢 ERROR: timezonesController(): ', error)
    throw Error(error.message)
  }
}
