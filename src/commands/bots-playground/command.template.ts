import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('This is a test command')
    .setDefaultMemberPermissions('0')
    .addStringOption((string) =>
      string.setName('user').setDescription('@username or ID').setRequired(true),
    )
    .setDefaultMemberPermissions(null),
  async execute(interaction: CommandInteraction) {
    return interaction.reply({
      embeds: [
        {
          title: 'Test command',
        },
      ],
    })
  },
}
