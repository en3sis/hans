import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import {
  // enableSentimentAnalysis,
  purgeMessages,
} from '../controllers/plugins/moderation.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
//github.com/discordjs/discord.js/blob/main/packages/builders/docs/examples/Slash%20Command%20Builders.md
https: module.exports = {
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
        ),
    ),
  // .addSubcommandGroup((group) =>
  //   group
  //     .setName('sentiment')
  //     .setDescription('Plugin: Sentiment Analysis')
  //     .addSubcommand((subcommand) =>
  //       subcommand
  //         .setName('subscribe')
  //         .setDescription('Subscribe to sentiment analysis notifications')
  //         .addChannelOption((option) =>
  //           option
  //             .setRequired(true)
  //             .setName('channel')
  //             .setDescription('Channel for Hans to report'),
  //         ),
  //     )
  //     .addSubcommand((subcommand) =>
  //       subcommand
  //         .setName('toggle')
  //         .setDescription('Enables/Disables the plugin.')
  //         .addBooleanOption((option) =>
  //           option
  //             .setRequired(true)
  //             .setName('status')
  //             .setDescription('True for enable, False to disable'),
  //         ),
  //     ),
  // ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.memberPermissions.has(['Administrator']))
        return interaction.reply({
          content: 'You do not have permission to use this command',
          ephemeral: true,
        })
      if (!interaction.isChatInputCommand()) return

      if (interaction.options.getSubcommandGroup() === 'sentiment') {
        if (interaction.options.getSubcommand() === 'toggle') {
          // await toggleSentimentAnalysis(interaction)
        } else {
          // await enableSentimentAnalysis(interaction)
        }
      } else if (interaction.options.getSubcommandGroup() === 'messages') {
        await purgeMessages(interaction)
      }
    } catch (error) {
      console.error('❌ Command: moderation: ', error)
      throw new Error(error)
    }
  },
}
