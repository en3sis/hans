import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import {
  subscribeToSubreddit,
  unsubscribeToSubreddit,
} from '../controllers/plugins/reddit.controller'

// TODO: Add a subcommand to list all the subreddits the guild is subscribed to
// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('reddit')
    .setDescription('Subscribed to a given subreddit and notify on new posts')
    .setDefaultMemberPermissions('0')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('subscribe')
        .setDescription('Subscribe to a subreddit')
        .addStringOption((string) =>
          string.setName('subreddit').setDescription('The name of the Subreddit').setRequired(true),
        )
        .addStringOption((string) =>
          string
            .setName('channel')
            .setDescription('Channel ID for the notifications')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('unsubscribe')
        .setDescription('Unsubscribe from a subreddit')
        .addStringOption((string) =>
          string.setName('subreddit').setDescription('The name of the Subreddit').setRequired(true),
        ),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.memberPermissions.has(['Administrator']))
        interaction.reply({
          content: 'You do not have permission to use this command',
          ephemeral: true,
        })
      if (!interaction.isChatInputCommand()) return

      const subreddit = interaction.options.get('subreddit')!.value as string

      if (interaction.options.getSubcommand() === 'subscribe') {
        const channel = interaction.options.get('channel')!.value as string
        await subscribeToSubreddit(subreddit, interaction.guildId, channel)

        return interaction.reply({
          content: `✅ Subscribed to r/${subreddit}. New notifications will be send to the specific channel`,
          ephemeral: true,
        })
      } else if (interaction.options.getSubcommand() === 'unsubscribe') {
        await unsubscribeToSubreddit(subreddit, interaction.guildId)

        return interaction.reply({
          content: `❌ Unsubscribed from r/${subreddit}`,
          ephemeral: true,
        })
      }
    } catch (error) {
      console.log('❌ ERROR: reddit(): ', error)
    }
  },
}
