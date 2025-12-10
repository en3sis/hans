import { randomUUID } from 'crypto'
import { CommandInteraction, Message, ThreadChannel, User, TextChannel } from 'discord.js'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '../../libs/drizzle'
import { guilds, guildQuests } from '../../db/schema'
import { DEFAULT_COLOR } from '../../utils/colors'

interface CreateQuestData {
  title: string
  description: string
  question?: string
  answer?: string
  mode: string
  winnersCount?: number
  reward: string
  rewardCode?: string
  channelId: string
  createdBy: string
  expirationDate: string
}

export const createQuest = async (
  interaction: CommandInteraction,
  questData: CreateQuestData,
) => {
  try {
    // Get guild from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, interaction.guildId))
      .limit(1)

    if (!guildResult[0]) {
      throw new Error('Guild not found')
    }

    const newQuest = {
      id: randomUUID(),
      guildId: guildResult[0].id,
      title: questData.title,
      description: questData.description,
      question: questData.question,
      answer: questData.answer,
      mode: questData.mode,
      winnersCount: questData.winnersCount,
      reward: questData.reward,
      rewardCode: questData.rewardCode,
      channelId: questData.channelId,
      createdBy: questData.createdBy,
      expirationDate: questData.expirationDate,
      isClaimed: false,
      isPendingClaim: false,
    }

    // Insert quest into guild_quests table
    await db.insert(guildQuests).values(newQuest)

    // Create thread for the quest
    const channel = await interaction.guild.channels.fetch(questData.channelId)
    if (!channel?.isTextBased()) throw new Error('Invalid channel')

    const questEmbed = {
      title: `${questData.mode === 'quiz' ? '🎯' : '🎉'} ${newQuest.title}`,
      description: newQuest.description,
      fields: [
        ...(questData.mode === 'quiz'
          ? [
              {
                name: '❓ Question',
                value: newQuest.question,
              },
            ]
          : [
              {
                name: '🎲 How to Participate',
                value: 'React with 🎉 to enter the raffle!',
              },
              {
                name: '👥 Winners',
                value: `${newQuest.winnersCount || 1} lucky winner${
                  newQuest.winnersCount !== 1 ? 's' : ''
                } will be selected`,
              },
            ]),
        {
          name: '🎁 Reward',
          value: newQuest.reward,
        },
        {
          name: '⏰ Expires',
          value: new Date(newQuest.expirationDate).toLocaleString(),
        },
      ],
      color: DEFAULT_COLOR,
      footer: {
        text: `Quest ID: ${newQuest.id}`,
      },
    }

    const questMessage = await channel.send({ embeds: [questEmbed] })

    // For raffle mode, add the reaction
    if (questData.mode === 'raffle') {
      await questMessage.react('🎉')
    }

    let thread: ThreadChannel | null = null
    // Only create thread for quiz mode
    if (questData.mode === 'quiz') {
      thread = await questMessage.startThread({
        name: '🎯 Quest: ' + newQuest.title,
        autoArchiveDuration: 1440,
      })
    }

    // Update quest with thread ID and message ID
    await db
      .update(guildQuests)
      .set({
        threadId: thread?.id,
        messageId: questMessage.id,
      })
      .where(eq(guildQuests.id, newQuest.id))

    return thread || questMessage
  } catch (error) {
    console.error('❌ ERROR: createQuest', error)
    throw error
  }
}

export const checkQuestAnswer = async (message: Message) => {
  try {
    if (!message.guildId) return

    // Get guild ID from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, message.guildId))
      .limit(1)

    if (!guildResult[0]) return

    // Get active quests for this guild
    const quests = await db
      .select()
      .from(guildQuests)
      .where(
        and(
          eq(guildQuests.guildId, guildResult[0].id),
          eq(guildQuests.mode, 'quiz'),
          eq(guildQuests.isClaimed, false),
          eq(guildQuests.isPendingClaim, false),
          gt(guildQuests.expirationDate, new Date().toISOString()),
        ),
      )

    if (!quests?.length) return

    // Check if message is in a quest thread
    const quest = quests.find((q) => q.threadId === message.channelId)
    if (!quest) return

    // Check if answer is correct
    if (quest.answer && message.content.toLowerCase().includes(quest.answer.toLowerCase())) {
      // Get quest data
      const questData = await db
        .select()
        .from(guildQuests)
        .where(eq(guildQuests.id, quest.id))
        .limit(1)

      if (!questData[0]) return

      // Update quest as pending claim
      await db
        .update(guildQuests)
        .set({
          isPendingClaim: true,
          winner: {
            id: message.author.id,
            username: message.author.username,
            claimed_at: new Date().toISOString(),
            dm_sent: false,
          },
        })
        .where(eq(guildQuests.id, quest.id))

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

      // Send congratulation message in thread
      if (canReceiveDMs) {
        await (message.channel as TextChannel).send({
          embeds: [
            {
              title: '🎉 Correct Answer!',
              description: `Congratulations ${message.author}! You've won this quest!\nThe reward will be sent to you via DM shortly.`,
              color: DEFAULT_COLOR,
            },
          ],
        })

        // Send reward via DM
        await sendQuestReward(message.guildId, quest.id, message.author)
      } else {
        // Inform user they need to enable DMs
        await (message.channel as TextChannel).send({
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
    // Get guild ID from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, interaction.guildId))
      .limit(1)

    if (!guildResult[0]) {
      return {
        success: false,
        message: 'Guild not found.',
      }
    }

    // Get quest data - find pending claim where winner id matches user
    const questResults = await db
      .select()
      .from(guildQuests)
      .where(and(eq(guildQuests.guildId, guildResult[0].id), eq(guildQuests.isPendingClaim, true)))

    // Find quest where winner.id matches user
    const quest = questResults.find((q) => {
      const winner = q.winner as { id?: string } | null
      return winner?.id === interaction.user.id
    })

    if (!quest) {
      return {
        success: false,
        message: 'No pending quest rewards found for you.',
      }
    }

    // Send reward to user
    return await sendQuestReward(interaction.guildId, quest.id, interaction.user)
  } catch (error) {
    console.error('Error claiming quest reward:', error)
    return {
      success: false,
      message: 'An error occurred while claiming your reward.',
    }
  }
}

export const sendQuestReward = async (guildId: string, questId: string, user: User) => {
  try {
    // Get guild ID from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, guildId))
      .limit(1)

    if (!guildResult[0]) {
      return {
        success: false,
        message: 'Guild not found.',
      }
    }

    // Get quest data
    const questResult = await db
      .select()
      .from(guildQuests)
      .where(and(eq(guildQuests.guildId, guildResult[0].id), eq(guildQuests.id, questId)))
      .limit(1)

    if (!questResult[0]) {
      return {
        success: false,
        message: 'Quest not found.',
      }
    }

    const quest = questResult[0]

    // Send DM to winner
    await user.send({
      embeds: [
        {
          title: `🎉 You've won a quest reward!`,
          description: `Congratulations! You've won the "${quest.title}" quest in the server.`,
          fields: [
            {
              name: 'Reward',
              value: quest.reward,
            },
            {
              name: 'Reward Code',
              value: quest.rewardCode || 'No code provided for this reward.',
            },
          ],
          color: DEFAULT_COLOR,
        },
      ],
    })

    // Update quest as claimed
    await db
      .update(guildQuests)
      .set({
        isClaimed: true,
        isPendingClaim: false,
        winner: {
          ...(quest.winner as object),
          dm_sent: true,
          dm_failed: false,
        },
      })
      .where(eq(guildQuests.id, quest.id))

    return { success: true, message: 'Reward sent successfully' }
  } catch (error) {
    console.error('Failed to send DM to winner:', error)

    // Update quest to mark DM as failed
    const questData = await db.select().from(guildQuests).where(eq(guildQuests.id, questId)).limit(1)

    if (questData[0]) {
      await db
        .update(guildQuests)
        .set({
          winner: {
            ...(questData[0].winner as object),
            dm_failed: true,
          },
        })
        .where(eq(guildQuests.id, questId))
    }

    return {
      success: false,
      message: 'Failed to send reward DM. Please contact an admin.',
    }
  }
}

export const getActiveQuests = async (guildId: string) => {
  try {
    // Get guild ID from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, guildId))
      .limit(1)

    if (!guildResult[0]) return []

    const quests = await db
      .select()
      .from(guildQuests)
      .where(and(eq(guildQuests.guildId, guildResult[0].id), eq(guildQuests.isClaimed, false)))
      .orderBy(guildQuests.createdAt)

    return quests || []
  } catch (error) {
    console.error('Error getting active quests:', error)
    return []
  }
}

export const getQuestById = async (guildId: string, questId: string) => {
  try {
    // Get guild ID from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, guildId))
      .limit(1)

    if (!guildResult[0]) return null

    const questResult = await db
      .select()
      .from(guildQuests)
      .where(and(eq(guildQuests.guildId, guildResult[0].id), eq(guildQuests.id, questId)))
      .limit(1)

    return questResult[0] ?? null
  } catch (error) {
    console.error('Error getting quest by ID:', error)
    return null
  }
}

export const drawQuestWinners = async (
  interaction: CommandInteraction,
  questId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if user has permission
    const member = await interaction.guild.members.fetch(interaction.user.id)
    if (!member.permissions.has('Administrator')) {
      return {
        success: false,
        message: 'You do not have permission to draw winners.',
      }
    }

    // Get guild ID from database
    const guildResult = await db
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.guildId, interaction.guildId))
      .limit(1)

    if (!guildResult[0]) {
      return {
        success: false,
        message: 'Guild not found.',
      }
    }

    // Get quest data
    const questResult = await db
      .select()
      .from(guildQuests)
      .where(and(eq(guildQuests.guildId, guildResult[0].id), eq(guildQuests.id, questId)))
      .limit(1)

    if (!questResult[0]) {
      return {
        success: false,
        message: 'Quest not found.',
      }
    }

    const quest = questResult[0]

    if (quest.mode !== 'raffle') {
      return {
        success: false,
        message: 'This quest is not a raffle.',
      }
    }

    if (quest.isClaimed || quest.isPendingClaim) {
      return {
        success: false,
        message: 'This quest has already been claimed or is pending claim.',
      }
    }

    // Get the quest message
    const channel = await interaction.guild.channels.fetch(quest.channelId)
    if (!channel?.isTextBased()) {
      return { success: false, message: 'Invalid channel' }
    }

    const message = await channel.messages.fetch(quest.messageId)
    if (!message) {
      return { success: false, message: 'Quest message not found' }
    }

    // Get reaction users
    const reaction = message.reactions.cache.get('🎉')
    if (!reaction) {
      return { success: false, message: 'No participants found' }
    }

    // Fetch all users who reacted
    await reaction.users.fetch()
    const participants = Array.from(reaction.users.cache.values()).filter((user) => !user.bot)

    if (participants.length === 0) {
      return { success: false, message: 'No participants found' }
    }

    // Randomly select winners
    const winnersCount = Math.min(quest.winnersCount || 1, participants.length)
    const winners: any[] = []

    // Split reward codes if they exist
    const rewardCodes = quest.rewardCode
      ? quest.rewardCode.split(',').map((code) => code.trim())
      : []

    for (let i = 0; i < winnersCount; i++) {
      const winnerIndex = Math.floor(Math.random() * participants.length)
      const winner = participants.splice(winnerIndex, 1)[0]
      winners.push({
        id: winner.id,
        username: winner.username,
        selected_at: new Date().toISOString(),
        dm_sent: false,
        reward_code: rewardCodes[i] || undefined,
      })
    }

    // Update quest with winners
    await db
      .update(guildQuests)
      .set({
        isPendingClaim: true,
        winners: winners,
      })
      .where(eq(guildQuests.id, quest.id))

    // Send winner announcement and DMs if reward codes exist
    const thread = quest.threadId ? await interaction.guild.channels.fetch(quest.threadId) : null

    const winnerMentions = winners.map((w) => `<@${w.id}>`).join(', ')
    const announcementEmbed = {
      title: '🎉 Winners Drawn!',
      description: `Congratulations to our lucky winner${
        winners.length !== 1 ? 's' : ''
      }:\n${winnerMentions}\n\n${
        rewardCodes.length > 0
          ? 'Check your DMs for your reward code!'
          : 'A staff member will contact you shortly with your reward!'
      }`,
      color: DEFAULT_COLOR,
    }

    await message.reply({ embeds: [announcementEmbed] })
    if (thread?.isThread()) {
      await thread.send({ embeds: [announcementEmbed] })
    }

    // Send DMs to winners if reward codes exist
    if (rewardCodes.length > 0) {
      for (const winner of winners) {
        try {
          const user = await interaction.guild.members.fetch(winner.id)
          await user.send({
            embeds: [
              {
                title: '🎁 Quest Reward',
                description: `Congratulations on winning the quest "${quest.title}"!`,
                fields: [
                  {
                    name: 'Reward Description',
                    value: quest.reward,
                  },
                  {
                    name: 'Your Reward Code',
                    value: winner.reward_code || 'No code provided for this reward.',
                  },
                ],
                color: DEFAULT_COLOR,
              },
            ],
          })

          // Update winner's DM status
          winner.dm_sent = true
        } catch (error) {
          console.error(`Failed to send DM to winner ${winner.username}:`, error)
          winner.dm_failed = true
        }
      }
    }

    return {
      success: true,
      message: `Successfully drew ${winners.length} winner(s) for the quest.`,
    }
  } catch (error) {
    console.error('Error drawing quest winners:', error)
    return {
      success: false,
      message: 'An error occurred while drawing winners.',
    }
  }
}
