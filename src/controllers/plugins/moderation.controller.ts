import { Message, Permissions, TextChannel } from 'discord.js'
import { sentimentAnalysis } from '../../lib/sentiment'
import { sentimentUrgencyTable } from '../../utils/colors'

/**
 * @param message Message
 * @param notificationChannel DiscordJS TextChannel
 * @returns
 */
export const sentimentAnalysisFn = async (
  message: Message,
  notificationChannel: string,
  reactToPositive: boolean
) => {
  const score = await sentimentAnalysis(message.content)

  if (score.score >= 10 && reactToPositive) {
    message.react('🥰')
  } else if (score.score <= -8) {
    const channel = message.guild.channels.cache.get(notificationChannel) as TextChannel

    return channel.send({
      embeds: [
        {
          author: {
            name: message.author.username,
            iconURL: message.author.avatarURL(),
          },
          title: `Message:`,
          description: `${message.content} \n\n Go to message: [click here](${message.url})`,
          fields: [
            {
              name: '🔎 score',
              value: `${score.score}`,
              inline: true,
            },
            {
              name: '🔻 negatives',
              value: `${JSON.stringify(score.negative)}`,
              inline: true,
            },
            {
              name: '⬆️ positives',
              value: `${JSON.stringify(score.positive)}`,
              inline: true,
            },
            {
              name: '🦹‍♂️ Author ID',
              value: `${message.author.id}`,
              inline: true,
            },
            {
              name: '🧑‍⚖️  Suggestions',
              value: `User should: ${sentimentUrgencyTable(score.score)[0]}`,
              inline: true,
            },
          ],
          color: sentimentUrgencyTable(score.score)[1],
        },
      ],
    })
  }
}

export const removeLinks = async (
  message: Message,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowedLinks: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowedRoles: string[]
) => {
  if (
    message.member.permissions.has([
      Permissions.FLAGS.KICK_MEMBERS,
      Permissions.FLAGS.DEAFEN_MEMBERS,
    ])
  )
    return

  const expression =
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi
  const regex = new RegExp(expression)

  if (message.content.match(regex) !== null) {
    await message.delete()
  }
}
