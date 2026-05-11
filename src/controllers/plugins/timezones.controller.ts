import { formatDistance } from 'date-fns'
import { ChatInputCommandInteraction, Colors } from 'discord.js'
import { and, eq, inArray } from 'drizzle-orm'
import { TIMEZONES_LIST } from '../../data/timezones'
import { db } from '../../db/client'
import { usersSettings } from '../../db/schema'
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

      const existing = await db.query.usersSettings.findFirst({
        where: and(
          eq(usersSettings.user_id, interaction.user.id),
          eq(usersSettings.type, 'timezone'),
        ),
      })
      if (!existing) {
        await db.insert(usersSettings).values({
          user_id: interaction.user.id,
          type: 'timezone',
          metadata: { timezone },
        })
      } else {
        await db
          .update(usersSettings)
          .set({ metadata: { timezone } })
          .where(
            and(
              eq(usersSettings.user_id, interaction.user.id),
              eq(usersSettings.type, 'timezone'),
            ),
          )
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
      await db
        .delete(usersSettings)
        .where(
          and(eq(usersSettings.user_id, interaction.user.id), eq(usersSettings.type, 'timezone')),
        )
      await interaction.editReply({ content: 'Your timezone has been unset.' })
    } else if (command === 'diff') {
      const targetUser = interaction.options.getUser('user', true)
      const authorUser = interaction.user

      const data = await db.query.usersSettings.findMany({
        where: and(
          inArray(usersSettings.user_id, [targetUser.id, authorUser.id]),
          eq(usersSettings.type, 'timezone'),
        ),
      })

      const targetUserData = data.find((d) => d.user_id === targetUser.id)
      const authorUserData = data.find((d) => d.user_id === authorUser.id)

      if (targetUserData && authorUserData) {
        const targetUserTimezone = (targetUserData.metadata as { timezone?: string })?.timezone
        const authorTimezone = (authorUserData.metadata as { timezone?: string })?.timezone

        const getTimeZones = getTimeZonesTime(targetUserTimezone!, authorTimezone!)

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
              description: `**${targetUser.displayName}** is currently **${timeDifference} ${
                targetTimezoneIsInFuture ? 'ahead' : 'behind'
              }** with the local time being **${extractHours(
                getTimeZones.targetLocalTime,
              )}** and yours being **${extractHours(getTimeZones.authorLocalTime)}**`,
              fields: [
                {
                  name: 'Your timezone',
                  value: `${authorTimezone} (${extractHours(getTimeZones.authorLocalTime)})`,
                  inline: true,
                },
                {
                  name: `${targetUser.displayName} 's timezone`,
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
