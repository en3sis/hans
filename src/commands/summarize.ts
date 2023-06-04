import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { summarizeController } from '../controllers/plugins/summarize.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Uses Hans AI to summarize a text or message')
    .addStringOption((string) =>
      string.setName('prompt').setDescription('Text or message id to summarize').setRequired(true),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.deferReply()

      await summarizeController(interaction)
    } catch (error) {
      console.error('❌ tools.ts: ', error)
      throw new Error(error)
    }
  },
}
