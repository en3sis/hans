import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { timezonesController } from '../controllers/plugins/timezones.controller'
import { logger } from '../utils/debugging'

module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('timezone')
    .setDescription('Set your timezone & get the time of another user')
    .setDefaultMemberPermissions(null)
    .addSubcommand((command) =>
      command
        .setName('set')
        .setDescription('Set your timezone')
        .addStringOption((option) =>
          option.setName('zone').setDescription('Your timezone(TZ Identifier)').setRequired(true),
        ),
    )
    .addSubcommand((command) => command.setName('unset').setDescription('Unset your timezone'))
    .addSubcommand((command) =>
      command
        .setName('diff')
        .setDescription('Shows the differences between your timezone and another @user')
        .addUserOption((option) =>
          option.setName('user').setDescription('@username').setRequired(true),
        ),
    )
    .addSubcommand((command) =>
      command.setName('list').setDescription('Lists all the available timezones'),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.isChatInputCommand()) return

      if (interaction.options.getSubcommand() === 'list') {
        return interaction.editReply({
          embeds: [
            {
              title: 'Timezones list',
              description: `Find your timezone 🔗[here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) and copy the data on the **TZ Identifier**`,
            },
          ],
        })
      } else {
        await timezonesController(interaction)
      }
    } catch (error) {
      logger('❌ Command: timezone: ', error)
    }
  },
}
