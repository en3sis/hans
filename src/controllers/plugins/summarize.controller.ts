import { CommandInteraction, TextChannel } from 'discord.js'
import { Hans } from '../..'
import { inference } from '../../libs/huggingface'
import { MESSAGE_ID_REGEX } from '../../utils/regex'
import { resolveGuildPlugins } from '../bot/plugins.controller'

export const summarizeController = async (interaction: CommandInteraction) => {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      await interaction.editReply('Command could not be executed at this moment.')

      throw Error('💢 HUGGINGFACE_API_KEY is missing from the `.env` file.')
    }

    const guildPlugin = await resolveGuildPlugins(interaction.guildId!, 'summarize')

    if (!guildPlugin.enabled)
      await interaction.editReply('This feature is not enabled for this server.')

    let text = interaction.options.get('prompt')!.value as string

    if (text.match(MESSAGE_ID_REGEX)) {
      const channel = Hans.channels.cache.get(interaction.channelId!) as TextChannel
      const message = await channel.messages.fetch(text)
      text = message.content

      if (!text)
        await interaction.editReply(
          `Message not found on this channel or ${Hans.user.username} has no permission to read it.`,
        )
    }

    const { summary_text } = await inference.summarization({
      model: 'google/pegasus-cnn_dailymail',
      parameters: {
        min_length: 10,
      },
      inputs: text,
    })

    return await interaction.editReply({
      content: summary_text,
    })
  } catch (error) {
    throw Error(error.message)
  }
}
