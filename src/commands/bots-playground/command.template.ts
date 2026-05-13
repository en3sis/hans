import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction } from 'discord.js'

/**
 * Template for new slash commands. Copy this file into `src/commands/` and
 * rename it. While iterating, keep `wip: true` so the command only ships to
 * your dev guild (via `yarn slash:dev`). Remove the `wip` line before
 * running `yarn slash` to make it available in production.
 *
 * Files in this `bots-playground/` folder are NOT auto-loaded — the deploy
 * script reads only `src/commands/` top-level. Treat this as a reference.
 */
module.exports = {
  ephemeral: false,
  wip: true,
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('This is a test command')
    .setDefaultMemberPermissions(null),
  async execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
      embeds: [{ title: 'Test command' }],
    })
  },
}
