import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction } from 'discord.js'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
export default {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('MoCks YoUr TeXt')
    .addStringOption((string) =>
      string.setName('text').setDescription('Your sentence to be mocked').setRequired(true),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const text = interaction.options.get('text')!.value as string

      await interaction.channel.send(
        text
          .split('')
          .map((letter, i) => (i % 2 == 0 ? letter.toUpperCase() : letter.toLowerCase()))
          .join(''),
      )
      await interaction.channel.send('<:mock:1016362569088376924>')

      await interaction.editReply({ content: 'Done :P' })
    } catch (error) {
      logger('❌ Command: mock: ', error)
    }
  },
}
