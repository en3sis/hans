import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('MoCks YoUr TeXt')
    .addStringOption((string) =>
      string.setName('text').setDescription('Your sentance to be mocked').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    const text = interaction.options.getString('text')

    await interaction.channel.send(
      text
        .split('')
        .map((letter, i) => (i % 2 == 0 ? letter.toUpperCase() : letter.toLowerCase()))
        .join('')
    )
    await interaction.channel.send('<:mock:1016362569088376924>')

    await interaction.reply({ content: 'Done :P', ephemeral: true })
  },
}
