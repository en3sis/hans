import { CommandInteraction, Message, ThreadChannel, User } from 'discord.js'
import supabase from '../../libs/supabase'
import { GuildPluginQuestsMetadata } from '../../types/plugins'
import { DEFAULT_COLOR } from '../../utils/colors'
import { isStaff } from '../../utils/permissions'
import { v4 as uuidv4 } from 'uuid'

type QuestData = GuildPluginQuestsMetadata['metadata']['quests'][0]

export const createQuest = async (
  interaction: CommandInteraction,
  questData: Omit<
    QuestData,
    'id' | 'created_at' | 'is_claimed' | 'is_pending_claim' | 'thread_id' | 'winner'
  >,
) => {
  try {
    // Get current plugin data
    const { data: pluginData } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'quests')
      .eq('owner', interaction.guildId)
      .single()

    const metadata = pluginData?.metadata || { quests: [], settings: {} }
    const newQuest: QuestData = {
      ...questData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      is_claimed: false,
      is_pending_claim: false,
    }

    // Add new quest to metadata
    metadata.quests = [...(metadata.quests || []), newQuest]

    // Update plugin metadata
    const { error } = await supabase
      .from('guilds_plugins')
      .update({ metadata })
      .eq('name', 'quests')
      .eq('owner', interaction.guildId)

    if (error) throw error

    // Create thread for the quest
    const channel = await interaction.guild.channels.fetch(questData.channel_id)
    if (!channel?.isTextBased()) throw new Error('Invalid channel')

    const questEmbed = {
      title: `🎯 ${newQuest.title}`,
      description: newQuest.description,
      fields: [
        {
          name: '❓ Question',
          value: newQuest.question,
        },
        {
          name: '🎁 Reward',
          value: newQuest.reward,
        },
        {
          name: '⏰ Expires',
          value: new Date(newQuest.expiration_date).toLocaleString(),
        },
      ],
      color: DEFAULT_COLOR,
      footer: {
        text: `Quest ID: ${newQuest.id}`,
      },
    }

    const questMessage = await channel.send({ embeds: [questEmbed] })
    const thread = await questMessage.startThread({
      name: `🎯 Quest: ${newQuest.title}`,
      autoArchiveDuration: 1440,
    })

    // Update quest with thread ID
    metadata.quests = metadata.quests.map((q) =>
      q.id === newQuest.id ? { ...q, thread_id: thread.id } : q,
    )

    await supabase
      .from('guilds_plugins')
      .update({ metadata })
      .eq('name', 'quests')
      .eq('owner', interaction.guildId)

    return thread
  } catch (error) {
    console.error('❌ ERROR: createQuest', error)
    throw error
  }
}

export const checkQuestAnswer = async (message: Message) => {
  try {
    if (!message.channel.isThread()) return
    const thread = message.channel as ThreadChannel

    // Get plugin data
    const { data: pluginData } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'quests')
      .eq('owner', message.guildId)
      .single()

    if (!pluginData?.metadata?.quests) return

    // Find quest by thread ID
    const quest = pluginData.metadata.quests.find(
      (q) => q.thread_id === thread.id && !q.is_claimed && !q.is_pending_claim,
    )

    if (!quest) return

    // Check if quest has expired
    if (new Date(quest.expiration_date) < new Date()) {
      await thread.setArchived(true)
      await thread.send({
        embeds: [
          {
            title: '⏰ Quest Expired',
            description: 'This quest has expired and can no longer be completed.',
            color: 0xff0000,
          },
        ],
      })
      return
    }

    // Check answer
    if (message.content.toLowerCase().trim() === quest.answer.toLowerCase().trim()) {
      // Check if user has DMs enabled
      let canReceiveDMs = true
      try {
        // Try to send a test DM
        await message.author.send({
          embeds: [
            {
              title: '🎯 Quest Reward Check',
              description:
                'This is a test message to check if you can receive DMs from the bot. You have correctly answered a quest and will receive your reward shortly!',
              color: DEFAULT_COLOR,
            },
          ],
        })
      } catch (error) {
        canReceiveDMs = false
      }

      // Update quest as pending claim or claimed based on DM status
      const metadata = pluginData.metadata
      metadata.quests = metadata.quests.map((q) => {
        if (q.id === quest.id) {
          if (canReceiveDMs) {
            // If DMs are open, mark as pending claim
            return {
              ...q,
              is_pending_claim: true,
              winner: {
                id: message.author.id,
                username: message.author.username,
                claimed_at: new Date().toISOString(),
                dm_sent: false,
              },
            }
          } else {
            // If DMs are closed, just mark as pending
            return {
              ...q,
              is_pending_claim: true,
              winner: {
                id: message.author.id,
                username: message.author.username,
                claimed_at: new Date().toISOString(),
                dm_sent: false,
                dm_failed: true,
              },
            }
          }
        }
        return q
      })

      await supabase
        .from('guilds_plugins')
        .update({ metadata })
        .eq('name', 'quests')
        .eq('owner', message.guildId)

      // Send congratulation message in thread
      if (canReceiveDMs) {
        await thread.send({
          embeds: [
            {
              title: '🎉 Correct Answer!',
              description: `Congratulations ${message.author}! You've won this quest!\nThe reward will be sent to you via DM shortly.`,
              color: DEFAULT_COLOR,
            },
          ],
        })

        // Send reward via DM
        try {
          await sendQuestReward(message.guildId, quest.id, message.author)
        } catch (error) {
          console.error('Failed to send DM to winner:', error)
          await thread.send({
            content: `${message.author} I couldn't send you a DM. Please make sure you have DMs enabled for this server and use \`/quests claim\` to claim your reward.`,
          })
        }
      } else {
        // Inform user they need to enable DMs
        await thread.send({
          embeds: [
            {
              title: '🎉 Correct Answer!',
              description: `Congratulations ${message.author}! You've won this quest!\n\n**However, I couldn't send you a DM with your reward.**\n\nPlease enable DMs for this server in your Privacy Settings, then use \`/quests claim\` to claim your reward.`,
              color: DEFAULT_COLOR,
              fields: [
                {
                  name: 'How to enable DMs',
                  value:
                    '1. Right-click on the server icon\n2. Select "Privacy Settings"\n3. Enable "Direct Messages"\n4. Use `/quests claim` to get your reward',
                },
              ],
            },
          ],
        })
      }
    }
  } catch (error) {
    console.error('❌ ERROR: checkQuestAnswer', error)
  }
}

export const claimQuestReward = async (interaction: CommandInteraction) => {
  try {
    // Get plugin data
    const { data: pluginData } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'quests')
      .eq('owner', interaction.guildId)
      .single()

    if (!pluginData?.metadata?.quests) {
      return {
        success: false,
        message: 'No quests found for this server.',
      }
    }

    // Find pending quests for this user
    const pendingQuests = pluginData.metadata.quests.filter(
      (q) => q.is_pending_claim && q.winner?.id === interaction.user.id && !q.is_claimed,
    )

    if (pendingQuests.length === 0) {
      return {
        success: false,
        message: 'You have no pending quest rewards to claim.',
      }
    }

    // Try to send rewards for all pending quests
    const results = await Promise.all(
      pendingQuests.map((quest) =>
        sendQuestReward(interaction.guildId, quest.id, interaction.user),
      ),
    )

    // Count successes and failures
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    if (successful > 0 && failed === 0) {
      return {
        success: true,
        message: `Successfully sent ${successful} quest reward${successful !== 1 ? 's' : ''} to your DMs!`,
      }
    } else if (successful > 0 && failed > 0) {
      return {
        success: true,
        message: `Sent ${successful} quest reward${successful !== 1 ? 's' : ''} to your DMs, but failed to send ${failed} reward${failed !== 1 ? 's' : ''}.`,
      }
    } else {
      return {
        success: false,
        message:
          'Failed to send quest rewards. Please make sure you have DMs enabled for this server.',
      }
    }
  } catch (error) {
    console.error('❌ ERROR: claimQuestReward', error)
    return {
      success: false,
      message: 'An error occurred while claiming your rewards.',
    }
  }
}

export const sendQuestReward = async (guildId: string, questId: string, user: User) => {
  try {
    // Get plugin data
    const { data: pluginData } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'quests')
      .eq('owner', guildId)
      .single()

    if (!pluginData?.metadata?.quests) {
      return { success: false, message: 'Quest not found' }
    }

    // Find the quest
    const questIndex = pluginData.metadata.quests.findIndex((q) => q.id === questId)
    if (questIndex === -1) {
      return { success: false, message: 'Quest not found' }
    }

    const quest = pluginData.metadata.quests[questIndex]

    // Check if this is the winner
    if (!quest.winner || quest.winner.id !== user.id) {
      return { success: false, message: 'You are not the winner of this quest' }
    }

    // Check if already claimed
    if (quest.is_claimed) {
      return { success: false, message: 'Reward already claimed' }
    }

    // Send the reward via DM
    try {
      await user.send({
        embeds: [
          {
            title: '🎁 Quest Reward',
            description: `Congratulations on completing the quest "${quest.title}"!`,
            fields: [
              {
                name: 'Reward Description',
                value: quest.reward,
              },
              {
                name: 'Reward Code',
                value: quest.reward_code || 'No code provided for this reward.',
              },
            ],
            color: DEFAULT_COLOR,
          },
        ],
      })

      // Update quest as claimed
      const metadata = pluginData.metadata
      metadata.quests[questIndex] = {
        ...quest,
        is_claimed: true,
        is_pending_claim: false,
        winner: {
          ...quest.winner,
          dm_sent: true,
          dm_failed: false,
        },
      }

      await supabase
        .from('guilds_plugins')
        .update({ metadata })
        .eq('name', 'quests')
        .eq('owner', guildId)

      return { success: true, message: 'Reward sent successfully' }
    } catch (error) {
      console.error('Failed to send DM to winner:', error)

      // Update quest to mark DM as failed
      const metadata = pluginData.metadata
      metadata.quests[questIndex] = {
        ...quest,
        winner: {
          ...quest.winner,
          dm_failed: true,
        },
      }

      await supabase
        .from('guilds_plugins')
        .update({ metadata })
        .eq('name', 'quests')
        .eq('owner', guildId)

      return { success: false, message: 'Failed to send DM' }
    }
  } catch (error) {
    console.error('❌ ERROR: sendQuestReward', error)
    return { success: false, message: 'An error occurred' }
  }
}

export const getActiveQuests = async (guildId: string) => {
  try {
    const { data: pluginData, error } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'quests')
      .eq('owner', guildId)
      .single()

    if (error) throw error

    const now = new Date().toISOString()
    return (pluginData?.metadata?.quests || []).filter(
      (quest) => !quest.is_claimed && quest.expiration_date > now,
    )
  } catch (error) {
    console.error('❌ ERROR: getActiveQuests', error)
    return []
  }
}

export const getQuestById = async (guildId: string, questId: string) => {
  try {
    const { data: pluginData, error } = await supabase
      .from('guilds_plugins')
      .select('metadata')
      .eq('name', 'quests')
      .eq('owner', guildId)
      .single()

    if (error) throw error

    return pluginData?.metadata?.quests?.find((q) => q.id === questId) || null
  } catch (error) {
    console.error('❌ ERROR: getQuestById', error)
    return null
  }
}
