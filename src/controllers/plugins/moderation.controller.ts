import { CommandInteraction, Message, TextChannel } from 'discord.js'
import { sentimentUrgencyTable } from '../../utils/colors'
import { sentimentAnalysis } from './../../lib/sentiment'

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

export const purgeMessages = async (interaction: CommandInteraction) => {
  try {
    const amount = interaction.options.get('n').value as number

    if (!interaction.memberPermissions.has(['Administrator']))
      return interaction.reply({
        content: 'You do not have permission to use this command',
        ephemeral: true,
      })

    if (amount > 100) {
      return interaction.reply({
        content: 'You can only delete up to 100 messages at once.',
        ephemeral: true,
      })
    }

    const fetched = await interaction.channel.messages.fetch({
      limit: amount,
    })

    await interaction.channel.bulkDelete(fetched).catch((err) => {
      console.error(err)

      return interaction.reply({
        content: `💢 ${err}`,
        ephemeral: true,
      })
    })

    await interaction.reply({ content: `🗑 Deleted ${amount} messages.`, ephemeral: true })
  } catch (error) {
    interaction.reply(`Couldn't delete messages because of: ${error}`)
  }
}

// // exports a function that enables sentiment analysis in the database
// export const enableSentimentAnalysis = async (interaction: CommandInteraction) => {
//   await updateOneGuild(interaction.guild, {
//     'plugins.moderation.sentimentAnalysis': {
//       enabled: true,
//       watchAllChannels: true,
//       logChannelId: interaction.options.get('channel')?.value as string,
//     },
//   })

//   return interaction.reply({
//     content: `Sentiment analysis enabled! ${HAS_CACHE_MESSAGE}`,
//     ephemeral: true,
//   })
// }

// export const toggleSentimentAnalysis = async (interaction: CommandInteraction) => {
//   try {
//     const status = interaction.options.get('status')?.value

//     if (status) {
//       await updateOneGuild(interaction.guild, {
//         'plugins.moderation.sentimentAnalysis.enabled': true,
//       })
//     } else {
//       await updateOneGuild(interaction.guild, {
//         'plugins.moderation.sentimentAnalysis.enabled': false,
//       })
//     }

//     return interaction.reply({
//       content: `Sentiment analysis ${status ? 'enabled' : 'disabled'}! ${HAS_CACHE_MESSAGE}`,
//       ephemeral: true,
//     })
//   } catch (error) {
//     return interaction.reply({
//       content: `💢 ${error}`,
//       ephemeral: true,
//     })
//   }
// }
