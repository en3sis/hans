import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { getUserEvents } from '../controllers/plugins/events.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription(
      'Provides quick Add to calendar links for Google & Outlook for the events you are subscribed to',
    )
    .setDefaultMemberPermissions('0'),
  async execute(interaction: CommandInteraction) {
    await getUserEvents(interaction)
  },
}
