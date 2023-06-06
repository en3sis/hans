import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { inviteBot } from '../controllers/bot/index.controller'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Link to invite Hans to your own Server'),
  async execute(interaction: CommandInteraction) {
    try {
      const inviteEmbed = inviteBot(interaction.client)
      await interaction.editReply({ ...inviteEmbed })
    } catch (error) {
      logger('❌ Command: invite: ', error)
    }
  },
}
