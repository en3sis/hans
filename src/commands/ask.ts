import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller'
import { gpt3Controller } from '../controllers/plugins/chat-gpt3.controller'
import { DEFAULT_COLOR } from '../utils/colors'
import { decrypt } from '../utils/crypto'

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

      if (!data.premium && metadata?.api_key === null)
        return await interaction.editReply(
          'Your API-Key & Organization is not set. Please set it using `/plugins chatGtp` command.',
        )

      if (data.premium || metadata?.api_key) {
        const prompt = interaction.options.get('prompt')!.value as string

        const API_KEY = data.premium ? process.env.OPENAI_API_KEY : decrypt(metadata.api_key)

        const ORGANIZATION = data.premium ? process.env.OPENAI_ORGANIZATION : decrypt(metadata.org)

        const answer = await gpt3Controller(prompt, API_KEY, ORGANIZATION)
        await interaction.editReply({
          embeds: [
            {
              author: {
                name: `${interaction.user.username} asked:`,
                icon_url: interaction.user.avatarURL(),
              },
              description: `${prompt}`,
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
              color: DEFAULT_COLOR,
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
