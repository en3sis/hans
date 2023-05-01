import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller.'
import { gpt3Controller } from '../controllers/plugins/chat-gpt3.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Uses Hans AI to generate responses to your prompts')
    .addStringOption((string) =>
      string
        .setName('prompt')
        .setDescription('Enter a prompt or question to generate a response from Hans AI')
        .setRequired(true),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply()
      const { enabled, metadata, data } = await resolveGuildPlugins(interaction.guildId!, 'chatGtp')

      if (!enabled)
        return await interaction.editReply('This feature is not enabled for this server.')

      if (!data.premium && metadata.apiKey === null)
        return await interaction.editReply(
          'Your API-Key & Organization is not set. Please set it using `/plugins chatGtp` command.',
        )

      if (data.premium) {
        const text = interaction.options.get('prompt')!.value as string

        const API_KEY = data.premium ? process.env.OPENAI_API_KEY : metadata.apiKey
        const ORGANIZATION = data.premium ? process.env.OPENAI_ORGANIZATION : metadata.organization

        const answer = await gpt3Controller(text, API_KEY, ORGANIZATION)
        await interaction.editReply({
          embeds: [
            {
              author: {
                name: `${interaction.user.username} asked:`,
                icon_url: interaction.user.avatarURL(),
              },
              description: `${text}`,
              color: 0x5865f2,
            },
            {
              author: {
                name: `${interaction.client.user.username} answered: `,
                icon_url: interaction.client.user.avatarURL(),
              },
              description: `${answer.response}`,
              footer: {
                text: `Tokens: ${answer.token} | Price: $${((answer.token / 1000) * 0.002).toFixed(
                  6,
                )}`,
              },
              color: 0x73ec8e,
            },
          ],
        })
      } else {
        return await interaction.editReply('This feature is only available for premium servers.')
      }
    } catch (error) {
      console.log('❌ Command: ask(): ', error)
    }
  },
}
