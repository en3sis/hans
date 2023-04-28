import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { findOneGuild } from '../controllers/mongodb/mongo-guilds.controller'
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
      const document = await findOneGuild(interaction.guildId)

      if ('status' in document) {
        return
      } else {
        if (document.premium) {
          const text = interaction.options.get('prompt')!.value as string

          const answer = await gpt3Controller(text)
          await interaction.reply({
            embeds: [
              {
                title: 'AI generated response',
                description: `${answer}`,
                footer: {
                  text: ``,
                },
                color: 0x5865f2,
              },
            ],
          })
        } else {
          return await interaction.reply('This feature is only available for premium servers.')
        }
      }
    } catch (error) {
      console.log('inter', interaction)

      console.log('❌ ai(): ', error)
    }
  },
}
