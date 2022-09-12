import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { purgeMessages } from '../controllers/admin/purge.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Moderation utility tools')
    .setDefaultMemberPermissions('0')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('purge')
        .setDescription('Removes {n} number of messages')
        .addNumberOption((option) =>
          option.setRequired(true).setName('n').setDescription('Amount of messages, max 100'),
        ),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      await purgeMessages(interaction)
    } catch (error) {
      console.log('❌ ERROR: recipe(): ', error)
    }
  },
}
