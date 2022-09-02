import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Display Bot support information'),
  async execute(interaction: CommandInteraction) {
    await interaction.reply({
      embeds: [
        {
          title: '📨 Hans support',
          description:
            'Please feel free to join Hans Discord server for support. [🔗 Invite link](https://discord.gg/WpTrnnvJXe)',
        },
      ],
    })
  },
}
