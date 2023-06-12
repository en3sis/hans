import { CommandInteraction } from 'discord.js'
import supabase from '../../libs/supabase'

export const guildActivitySetChannel = async (interaction: CommandInteraction, channel: string) => {
  try {
    const { data, error } = await supabase
      .from('guilds_plugins')
      .update({ metadata: { channelId: channel } })
      .eq('name', `serverMembersActivity`)
      .eq('owner', interaction.guildId)
    // .or(`name.eq.guildMemberAdd, name.eq.guildMemberRemove`)

    if (error) throw error

    await interaction.editReply({
      content: `Enabled guild activity notifications in <#${channel}>`,
    })

    return data
  } catch (error) {
    console.error('❌ ERROR: guildActivitySetChannel(): ', error)
  }
}
