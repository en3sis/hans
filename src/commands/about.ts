import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember } from 'discord.js'
import { getUserInformation } from '../controllers/engagement/user-info.controller'
import { logger } from '../utils/debugging'
import { extractUser } from '../utils/users'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Display information about a given user')
    .addUserOption((option) =>
      option.setName('user').setDescription('@username or ID').setRequired(true),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      const user = interaction.options.get('user')?.value as string

      if (!user)
        interaction.editReply({
          content: 'Please provide a user',
        })

      const _member = extractUser(user)

      const member: GuildMember = interaction.guild.members.cache.get(_member)

      const createsEmbed = getUserInformation(member)
      return await interaction.editReply({ embeds: [createsEmbed] })
    } catch (error) {
      logger('❌ Command: about: ', error)
    }
  },
}
