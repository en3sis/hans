import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { findOneGuild } from '../controllers/bot/guilds.controller'
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
      const res = await findOneGuild(interaction.guildId)

      if (res.premium) {
        const text = interaction.options.get('prompt')!.value as string

        const answer = await gpt3Controller(text)
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
      console.log('inter', interaction)

      console.log('❌ ai(): ', error)
    }
  },
}
