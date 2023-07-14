import { CommandInteraction, Message, TextChannel } from 'discord.js'
import { sentimentAnalysis } from '../../libs/sentiment'
import { sentimentUrgencyTable } from '../../utils/colors'

export const purgeMessages = async (interaction: CommandInteraction) => {
  try {
    const amount = interaction.options.get('n').value as number

    if (!interaction.memberPermissions.has(['Administrator']))
      return interaction.editReply({
        content: 'You do not have permission to use this command',
      })

    if (amount > 100) {
      return interaction.editReply({
        content: 'You can only delete up to 100 messages at once.',
      })
    }

    const fetched = await interaction.channel.messages.fetch({
      limit: amount,
    })

    await interaction.channel.bulkDelete(fetched).catch(async (err) => {
      await interaction.editReply({ content: err.message })
    })

    await interaction.editReply({ content: `🗑 Deleted ${amount} messages.` })
  } catch (error) {
    throw Error(error.message)
  }
}

export const removeLinks = async (
  message: Message,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowedLinks: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowedRoles: string[],
) => {
  if (message.member.permissions.has(['Administrator', 'DeafenMembers'])) return

  const expression =
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi
  const regex = new RegExp(expression)

  if (message.content.match(regex) !== null) {
    await message.delete()
  }
}

/**
 * @param message Message
 * @param notificationChannel DiscordJS TextChannel
 * @returns
 */
export const sentimentAnalysisFn = async (
  message: Message,
  notificationChannel: string,
  reactToPositive: boolean,
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
            icon_url: message.author.avatarURL(),
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
          color: sentimentUrgencyTable(score.score)[1] as number,
        },
      ],
    })
  }
}
