import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember } from 'discord.js'
import { getUserInformation } from '../controllers/engagement/user-info.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Display information about a given user')
    .addStringOption((string) =>
      string.setName('user').setDescription('@username or ID').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    try {
      let _member: string

      if (/<@!?\d+>/g.test(interaction.options.getString('user'))) {
        _member = interaction.options.getString('user').split(`<@!`)[1].replace('>', '')
      } else {
        _member = interaction.options.getString('user')
      }

      const member: GuildMember = interaction.guild.members.cache.get(_member)

      const createsEmbed = getUserInformation(member)
      return interaction.reply({ embeds: [createsEmbed] })
    } catch (error) {
      console.error('❌ ERROR: Command -> activities ', error)
    }
  }
}
