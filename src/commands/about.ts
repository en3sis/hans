import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember } from 'discord.js'
import { getUserInformation } from '../controllers/engagement/user-info.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
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
        interaction.reply({
          content: 'Please provide a user',
          ephemeral: true,
        })

      let _member: string

      if (/<@!?\d+>/g.test(user)) {
        _member = user.split(`<@!`)[1].replace('>', '')
      } else {
        _member = user
      }

      const member: GuildMember = interaction.guild.members.cache.get(_member)

      const createsEmbed = getUserInformation(member)
      return await interaction.reply({ embeds: [createsEmbed] })
    } catch (error) {
      console.error('❌ Command: about: ', error)
      throw new Error(error)
    }
  },
}
