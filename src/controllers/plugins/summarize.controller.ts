import { CommandInteraction, TextChannel } from 'discord.js'
import { Hans } from '../..'
import { inference } from '../../libs/huggingface'
import { MESSAGE_ID_REGEX } from '../../utils/regex'
import { resolveGuildPlugins } from '../bot/plugins.controller'

export const summarizeController = async (interaction: CommandInteraction) => {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      await interaction.editReply('Command could not be executed at this moment.')
      throw new Error('💢 HUGGINGFACE_API_KEY is missing from the `.env` file.')
    }

    const guildPlugin = await resolveGuildPlugins(interaction.guildId!, 'summarize')

    if (!guildPlugin.enabled)
      await interaction.editReply('This feature is not enabled for this server.')

    let text = interaction.options.get('prompt')!.value as string

    if (text.match(MESSAGE_ID_REGEX)) {
      const channel = Hans.channels.cache.get(interaction.channelId!) as TextChannel
      text = channel.messages.cache.get(text)?.content as string

      if (!text) {
        await interaction.editReply(
          `Message not found on this channel or ${Hans.user.username} has no permission to read it.`,
        )
        return
      }
    }

    const { summary_text } = await inference.summarization({
      model: 'facebook/bart-large-cnn',
      parameters: {
        max_length: 100,
      },
      inputs: text,
    })

    await interaction.editReply({
      content: summary_text,
    })
  } catch (error) {
    console.error('❌ summarizeController(): ', error)
    throw new Error(error)
  }
}
