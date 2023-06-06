import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { Hans } from '..'
import { logger } from '../utils/debugging'
// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Display Bot support information'),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.editReply({
        embeds: [
          {
            title: '📨 Hans support',
            description: `Please feel free to join Hans Discord server for support. \n[🔗 Discord Server](${Hans.settings.perma_invite})`,
            fields: [
              {
                name: '💢 Any issues?',
                value:
                  '[Open an Issue](https://github.com/en3sis/hans/issues/new?assignees=&labels=bug&template=bug_report.md&title=%5BBUG%5D)',
                inline: true,
              },
              {
                name: '💡 Any ideas?',
                value:
                  '[Send a suggestion](https://github.com/en3sis/hans/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=%5BFEATURE%5D)',
                inline: true,
              },
            ],
          },
        ],
      })
    } catch (error) {
      logger('❌ Command: support: ', error)
    }
  },
}
