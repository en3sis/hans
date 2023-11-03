import { Colors, CommandInteraction } from 'discord.js'
import { Hans } from '../..'
import { generateCalendarLinks } from '../../utils/calendar-links'

export const getUserEvents = async (interaction: CommandInteraction) => {
  try {
    const author = interaction.user

    const guildEvents = await Hans.guilds.cache.get(interaction.guildId)?.scheduledEvents.fetch()

    const event = await Promise.all(
      guildEvents.map(async (event) => {
        return await event.fetchSubscribers().then((subscribers) => {
          return {
            ...event,
            subscribers: subscribers.map((subscriber) => subscriber.user.id),
          }
        })
      }),
    )

    const subscribedEvents = event.filter((e) => e.subscribers.includes(author.id))

    const googleLinks = []
    const outlookLinks = []

    subscribedEvents.forEach((event) => {
      const e = guildEvents.find((e) => e.id === event.id)
      const g = generateCalendarLinks(e, 'google')
      googleLinks.push({
        name: e.name,
        value: g,
      })

      const o = generateCalendarLinks(e, 'outlook')
      outlookLinks.push({
        name: e.name,
        value: o,
      })
    })

    return interaction.editReply({
      embeds: [
        {
          title: '🗓️ Event Calendar Links',
          description: `
          ${author.displayName}, your following events are scheduled:

          **Google Calendar Links**:
          ${googleLinks.map((link) => `[${link.name}](${link.value})`).join('\n')}

          **Outlook Calendar Links**:
          ${outlookLinks.map((link) => `[${link.name}](${link.value})`).join('\n')}
          `,
          color: Colors.Aqua,
        },
      ],
    })
  } catch (error) {
    console.error('❌ ERROR: guildActivitySetChannel(): ', error)
  }
}
