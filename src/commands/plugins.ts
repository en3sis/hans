import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import {
  pluginChatGPTSettings,
  pluginThreadsSettings,
  pluginsListNames,
  toggleGuildPlugin,
} from '../controllers/bot/plugins.controller'
import { guildActivitySetChannel } from '../controllers/plugins/guild-activity.controller'
import { logger } from '../utils/debugging'

const list = pluginsListNames()

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Server plugins configuration')
    .setDefaultMemberPermissions('0')
    .addSubcommand((command) =>
      command
        .setName('toggle')
        .setDescription('Enable/disable a specific plugin')
        .addStringOption((option) =>
          option
            .setName('plugin_name')
            .setDescription('Select the plugin by name to enable/disable')
            .setRequired(true)
            .addChoices(...list),
        )
        .addBooleanOption((boolean) =>
          boolean
            .setName('plugin_toggle')
            .setDescription('Enable or Disable the selected plugin')
            .setRequired(true),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName('chatgpt')
        .setDescription('Sets your own ChatGPT API-KEY & Organization')
        .addStringOption((option) =>
          option
            .setName('api_key')
            .setDescription(
              'Your ChatGPT API-KEY. It will be encrypted with a aes-256-cbc algorithm',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('organization_id')
            .setDescription(
              'Your ChatGPT Organization ID. It will be encrypted with a aes-256-cbc algorithm',
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName('threads')
        .setDescription(
          'Enables the auto-creation of threads in a specific channel when a message is sent.',
        )
        .addChannelOption((option) =>
          option
            .setName('thread_channel')
            .setDescription('Channel which will act as a threads channel')
            .setRequired(true),
        )
        .addBooleanOption((option) =>
          option
            .setName('toggle')
            .setDescription(
              'If set to true, the bot will create a thread when a message is sent in the channel',
            ),
        )
        .addStringOption((option) =>
          option
            .setName('thread_title')
            .setDescription('The title of the automatic thread, optional'),
        )
        .addStringOption((option) =>
          option
            .setName('thread_automessage')
            .setDescription(
              'If set, the bot will send this message to the thread when created, optional',
            ),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName('server_activity')
        .setDescription('Sets the channel to send members join/leave notifications')
        .addChannelOption((option) =>
          option
            .setName('server_activity_channel')
            .setDescription('Channel which will recive the notifications')
            .setRequired(true),
        ),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.memberPermissions.has(['Administrator']))
        return interaction.editReply({
          content: 'You do not have permission to use this command',
        })

      if (!interaction.isChatInputCommand()) return

      if (interaction.options.getSubcommand() === 'toggle') {
        const name = interaction.options.get('plugin_name')!.value as string
        const enable = interaction.options.get('plugin_toggle')!.value as boolean

        await toggleGuildPlugin(interaction, name, enable)
      } else if (interaction.options.getSubcommand() === 'chatgpt') {
        const api_key = interaction.options.get('api_key')!.value as string
        const org = interaction.options.get('organization_id')!.value as string

        await pluginChatGPTSettings(interaction, api_key, org)
      } else if (interaction.options.getSubcommand() === 'server_activity') {
        const channel = interaction.options.get('server_activity_channel')!.value as string

        await guildActivitySetChannel(interaction, channel)
      } else if (interaction.options.getSubcommand() === 'threads') {
        await pluginThreadsSettings({
          interaction,
          metadata: {
            channelId: interaction.options.get('thread_channel')!.value as string,
            title: interaction.options.get('thread_title')?.value as string,
            autoMessage: interaction.options.get('thread_automessage')?.value as string,
            enabled: (interaction.options.getBoolean('toggle') as boolean) ?? true,
          },
        })
      }
    } catch (error) {
      logger('❌ Command: plugins: ', error)
    }
  },
}
