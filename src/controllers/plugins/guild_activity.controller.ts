import { CommandInteraction } from 'discord.js'
import supabase from '../../libs/supabase'

export const guildActivitySetChannel = async (interaction: CommandInteraction, channel: string) => {
  try {
    const { data, error } = await supabase
      .from('guilds-plugins')
      .update({ metadata: { channelId: channel } })
      .or(`name.eq.guildMemberAdd, name.eq.guildMemberRemove`)
      .eq('owner', interaction.guildId)

    if (error) throw error

    await interaction.reply({
      content: `Enabled guild activity notifications in <#${channel}>`,
      ephemeral: true,
    })

    return data
  } catch (error) {
    console.log('❌ ERROR: guildActivity(): ', error)
  }
}

export const guildActivityToggle = async (interaction: CommandInteraction, toggle: boolean) => {
  try {
    const { data, error } = await supabase
      .from('guilds-plugins')
      .update({ enabled: toggle })
      .or(`name.eq.guildMemberAdd, name.eq.guildMemberRemove`)
      .eq('owner', interaction.guildId)

    if (error) throw error

    await interaction.reply({
      content: `Members Join/Leave notifications plugin has been ${
        toggle ? 'enabled' : 'disabled'
      }`,
      ephemeral: true,
    })

    return data
  } catch (error) {
    console.log('❌ ERROR: guildActivity(): ', error)
  }
}
