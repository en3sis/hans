import { and, eq } from 'drizzle-orm'
import { CommandInteraction } from 'discord.js'
import { db } from '../../db/client'
import { guildsPlugins } from '../../db/schema'
import { deleteFromCache } from '../../libs/node-cache'

export const guildActivitySetChannel = async (interaction: CommandInteraction, channel: string) => {
  try {
    await db
      .update(guildsPlugins)
      .set({ metadata: { channelId: channel } })
      .where(
        and(
          eq(guildsPlugins.name, 'serverMembersActivity'),
          eq(guildsPlugins.owner, interaction.guildId!),
        ),
      )
    deleteFromCache(`guilds_plugins:${interaction.guildId}:serverMembersActivity`)

    await interaction.editReply({
      content: `Enabled guild activity notifications in <#${channel}>`,
    })
  } catch (error) {
    console.error('❌ ERROR: guildActivitySetChannel(): ', error)
  }
}
