import { Colors, CommandInteraction } from 'discord.js'
import { Hans } from '../..'
import { generateCalendarLinks } from '../../utils/calendar-links'

export const getUserEvents = async (interaction: CommandInteraction) => {
  try {
    const author = interaction.user

    const guildEvents = await Hans.guilds.cache.get(interaction.guildId)?.scheduledEvents.fetch()

    const event = await Promise.all(
      guildEvents.map(async (event) => {
        if (!event && !event.isActive) return

        return await event.fetchSubscribers().then((subscribers) => {
          return {
            ...event,
            subscribers: subscribers.map((subscriber) => subscriber.user.id),
          }
        })
      }),
    )

    const subscribedEvents = event.filter((e) => e.subscribers.includes(author.id))

    const links: {
      name: string
      value: string[]
    }[] = []

    subscribedEvents.forEach((_event) => {
      const event = guildEvents.find((e) => e.id === _event.id)
      const googleLink = generateCalendarLinks(event, 'google')
      const outlookLink = generateCalendarLinks(event, 'outlook')

      links.push({
        name: event.name,
        value: [googleLink, outlookLink],
      })
    })

    return interaction.editReply({
      embeds: [
        {
          title: '🗓️ Event Calendar Links',
          description: `
          ${author.displayName}, your following events are scheduled:

          ${links
            .map((link, i) => {
              return `${i + 1}: **${link.name} ** ∫ [Google](${link.value[0]}) ⊙ [Outlook](${
                link.value[1]
              })`
            })
            .join('\n')}
          `,
          color: Colors.Aqua,
        },
      ],
    })
  } catch (error) {
    console.error('❌ ERROR: guildActivitySetChannel(): ', error)
  }
}
