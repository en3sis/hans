import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller'
import { chatGptCommandHandler, chatGptUsage } from '../controllers/plugins/chat-gpt3.controller'
import { getTimeRemainingUntilMidnight } from '../utils/dates'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Uses Hans AI to generate responses to your prompts')
    .addStringOption((string) =>
      string
        .setName('prompt')
        .setDescription('Enter a prompt or question to generate a response from Hans AI')
        .setRequired(true),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      const {
        enabled,
        metadata: guildPlugin,
        data: guild,
      } = await resolveGuildPlugins(interaction.guildId!, 'chatGtp')

      if (!enabled)
        return await interaction.editReply('This plugin is not enabled for this server.')

      // Handles regular guilds
      if (!guild.premium) {
        // If the guild set its API Key, uses it
        if (guildPlugin?.api_key && guildPlugin?.org) {
          return await chatGptCommandHandler(interaction, guild, guildPlugin)
        }

        if (guildPlugin === null || guildPlugin?.usage === undefined) {
          await chatGptCommandHandler(interaction, guild, guildPlugin, 99)
          return await chatGptUsage(guildPlugin, interaction.guildId!)
        }

        if (guildPlugin?.usage !== 0) {
          await chatGptCommandHandler(interaction, guild, guildPlugin, guildPlugin?.usage)
          return await chatGptUsage(guildPlugin, interaction.guildId!)
        } else {
          return await interaction.editReply(
            `You have reached the limit of the free API, it will restart ⏳ ${getTimeRemainingUntilMidnight()}. You can add your own API Key using \`/plugins chatGtp\` command for unlimited usage in your server.`,
          )
        }
      } else {
        // Handles premium guilds
        await chatGptCommandHandler(interaction, guild, guildPlugin)
      }
    } catch (error) {
      logger('❌ Command: ask: ', error)
    }
  },
}
