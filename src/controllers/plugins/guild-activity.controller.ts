import { CommandInteraction } from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { db } from '../../libs/drizzle'
import { guildsPlugins } from '../../db/schema'

export const guildActivitySetChannel = async (interaction: CommandInteraction, channel: string) => {
  try {
    const result = await db
      .update(guildsPlugins)
      .set({ metadata: { channelId: channel } })
      .where(
        and(
          eq(guildsPlugins.name, 'serverMembersActivity'),
          eq(guildsPlugins.owner, interaction.guildId),
        ),
      )
      .returning()

    await interaction.editReply({
      content: `Enabled guild activity notifications in <#${channel}>`,
    })

    return result
  } catch (error) {
    console.error('❌ ERROR: guildActivitySetChannel(): ', error)
  }
}
