import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js'
import { openPanel } from '../services/plugin-panels'
import { logger } from '../utils/debugging'

/**
 * Single entry-point for plugin configuration. All settings live in the
 * interactive panel; per-plugin subcommands have been removed.
 */
module.exports = {
  ephemeral: true,
  // Do not auto-defer — the panel reply is a v2-components message which
  // must set IS_COMPONENTS_V2 on the initial response.
  defer: false,
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Open the interactive plugin settings panel')
    .setDefaultMemberPermissions('0'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.memberPermissions?.has(['Administrator'])) {
        return interaction.reply({
          content: 'You do not have permission to use this command',
          flags: MessageFlags.Ephemeral,
        })
      }
      await openPanel(interaction)
    } catch (error) {
      logger('❌ Command: plugins: ', error)
    }
  },
}
