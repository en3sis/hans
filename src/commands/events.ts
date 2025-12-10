import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction } from 'discord.js'
import { getUserEvents } from '../controllers/plugins/events.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
export default {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription(
      'Provides quick Add to calendar links for Google & Outlook for the events you are subscribed to',
    )
    .setDefaultMemberPermissions(null),
  async execute(interaction: ChatInputCommandInteraction) {
    await getUserEvents(interaction)
  },
}
