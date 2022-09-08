import { SlashCommandBuilder } from '@discordjs/builders'
import { PermissionFlagsBits } from 'discord-api-types/v10'
import { CommandInteraction } from 'discord.js'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Moderation utility tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('purge')
        .setDescription('Removes {n} number of messages')
        .addNumberOption((option) =>
          option.setRequired(true).setName('n').setDescription('Amount of messages, max 100')
        )
    ),
  async execute(interaction: CommandInteraction) {
    try {
      // await purgeMessages(interaction)
      interaction.reply({ content: 'Purge command is disabled', ephemeral: true })
    } catch (error) {
      console.log('❌ ERROR: recipe(): ', error)
    }
  },
}
