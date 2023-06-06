import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { summarizeController } from '../controllers/plugins/summarize.controller'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Uses Hans AI to summarize a text or message')
    .addStringOption((string) =>
      string.setName('prompt').setDescription('Text or message id to summarize').setRequired(true),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      await summarizeController(interaction)
    } catch (error) {
      logger('❌ Command: summarize: ', error)
    }
  },
}
