import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { inviteBot } from '../controllers/bot/index.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Link to invite Hans to your own Server'),
  async execute(interaction: CommandInteraction) {
    try {
      const inviteEmbed = inviteBot(interaction.client)
      await interaction.reply({ ...inviteEmbed, fetchReply: true })
    } catch (error) {
      console.error('❌ Command: invite: ', error)
      throw new Error(error)
    }
  },
}
