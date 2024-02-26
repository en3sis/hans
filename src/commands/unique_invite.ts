import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, TextChannel } from 'discord.js'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('unique_invite')
    .setDescription('Generates an unique, 24h duration invite to current channel')
    .setDefaultMemberPermissions('0'),
  async execute(interaction: CommandInteraction) {
    try {
      const cnl = interaction.channel as TextChannel

      cnl
        .createInvite({ maxUses: 1, unique: true })
        .then((invite) => {
          interaction.editReply(`Here's your invite link: ${invite.url}`)
        })
        .catch((error) => {
          console.error('Error creating invite:', error)
          interaction.reply('There was an error creating the invite.')
        })
    } catch (error) {
      logger('❌ Command: invite: ', error)
    }
  },
}
