import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { resolveGuildPlugins } from '../controllers/bot/plugins.controller'
import { chatGptCommandHandler, chatGptUsage } from '../controllers/plugins/chat-gpt.controller'
import { GuildPluginChatGTPMetadata } from '../types/plugins'
import { getTimeRemainingUntilMidnight } from '../utils/dates'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
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
        metadata: guildPluginData,
        data: guildData,
      } = (await resolveGuildPlugins(interaction.guildId!, 'chatGtp')) as GuildPluginChatGTPMetadata

      if (!enabled)
        return await interaction.editReply('This plugin is not enabled for this server.')

      // Handles regular guilds
      if (!guildData.premium) {
        // If the guild set its API Key, uses it
        if (guildPluginData?.api_key && guildPluginData?.org) {
          return await chatGptCommandHandler(interaction, guildData, guildPluginData)
        }

        if (guildPluginData === null || guildPluginData?.usage === undefined) {
          await chatGptCommandHandler(interaction, guildData, guildPluginData, 99)
          return await chatGptUsage(guildPluginData, interaction.guildId!)
        }

        if (guildPluginData?.usage !== 0) {
          await chatGptCommandHandler(
            interaction,
            guildData,
            guildPluginData,
            guildPluginData?.usage,
          )
          return await chatGptUsage(guildPluginData, interaction.guildId!)
        } else {
          return await interaction.editReply(
            `You have reached the daily limit of using the command. It will restart ⏳ ${getTimeRemainingUntilMidnight()}. An personal API key can be securely added using \`/plugins chatGtp\` command for unlimited usage in this server.`,
          )
        }
      } else {
        // Handles premium guilds
        await chatGptCommandHandler(interaction, guildData, guildPluginData)
      }
    } catch (error) {
      logger('❌ Command: ask: ', error)
    }
  },
}
