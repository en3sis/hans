import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember } from 'discord.js'
import { getUserInformation } from '../controllers/engagement/user-info.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Display information about a given user')
    .addUserOption((option) => option.setName('target').setDescription('The user')),
  async execute(interaction: CommandInteraction) {
    try {
      const x = interaction.options.getUser('target')
      const member: GuildMember = interaction.guild.members.cache.get(x.username)

      const createsEmbed = getUserInformation(member)
      return await interaction.reply({ embeds: [createsEmbed] })
    } catch (error) {
      console.error('❌ ERROR: Command -> activities ', error)
    }
  },
}
