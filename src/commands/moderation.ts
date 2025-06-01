import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { purgeMessages, purgeUserMessages } from '../controllers/plugins/moderation.controller'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Moderation utility tools')
    .setDefaultMemberPermissions('0')
    .addSubcommandGroup((group) =>
      group
        .setName('messages')
        .setDescription('Purge messages')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('purge')
            .setDescription('Removes the latest {n} messages from the channel')
            .addNumberOption((option) =>
              option.setRequired(true).setName('n').setDescription('Amount of messages, max 100'),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('user')
            .setDescription('Removes the latest {n} messages from a specific user')
            .addUserOption((option) =>
              option
                .setRequired(true)
                .setName('user')
                .setDescription('User to delete messages from'),
            )
            .addNumberOption((option) =>
              option.setRequired(true).setName('n').setDescription('Amount of messages, max 100'),
            ),
        ),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.memberPermissions.has(['Administrator']))
        return interaction.editReply({
          content: 'You do not have permission to use this command',
        })

      if (!interaction.isChatInputCommand()) return

      if (interaction.options.getSubcommandGroup() === 'messages') {
        const subcommand = interaction.options.getSubcommand()

        if (subcommand === 'purge') {
          await purgeMessages(interaction)
        } else if (subcommand === 'user') {
          await purgeUserMessages(interaction)
        }
      }
    } catch (error) {
      logger('❌ Command: moderation: ', error)
    }
  },
}
