import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction } from 'discord.js'
import { twitchController } from '../controllers/plugins/twitch.controller'
import { logger } from '../utils/debugging'

export default {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Fetches public Twitch profile information & status')
    .addStringOption((string) =>
      string.setName('username').setDescription('Twitch username').setRequired(true),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const username = interaction.options.get('username').value as string

      const embeds = await twitchController(username)

      interaction.editReply({ ...embeds })
    } catch (error) {
      logger('❌ Command: moderation: ', error)
    }
  },
}
