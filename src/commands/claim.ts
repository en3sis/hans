import { SlashCommandBuilder } from '@discordjs/builders'
import { ChatInputCommandInteraction } from 'discord.js'
import { claimQuestReward } from '../controllers/plugins/quests.controller'
import { logger } from '../utils/debugging'

/**
 * Standalone /claim command for users who won a quest but the bot couldn't
 * DM them the reward (DMs disabled). Replaces the legacy `/quests claim`.
 */
module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim a quest reward you have won'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const result = await claimQuestReward(interaction)
      await interaction.editReply({
        embeds: [
          {
            title: result.success ? '🎁 Quest reward claimed' : '❌ Claim failed',
            description: result.message,
            color: result.success ? 0x00ff00 : 0xff0000,
            fields: result.success
              ? []
              : [
                  {
                    name: 'How to enable DMs',
                    value:
                      '1. Right-click the server icon\n2. Privacy Settings\n3. Enable Direct Messages\n4. Try `/claim` again',
                  },
                ],
          },
        ],
      })
    } catch (error) {
      logger('❌ Command: claim: ', error)
      await interaction.editReply({
        content: 'Something went wrong while claiming your reward.',
      })
    }
  },
}
