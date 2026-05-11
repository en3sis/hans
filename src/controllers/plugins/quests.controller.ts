import { CommandInteraction, Message, TextChannel, ThreadChannel, User } from 'discord.js'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../../db/client'
import { guilds, guildQuests } from '../../db/schema'
import { GuildQuest } from '../../types/plugins'
import { DEFAULT_COLOR } from '../../utils/colors'
import { getPluginConfig } from '../bot/plugins.controller'

const guildPkByGuildId = async (guildId: string): Promise<number | null> => {
  const row = await db.query.guilds.findFirst({
    where: eq(guilds.guild_id, guildId),
    columns: { id: true },
  })
  return row?.id ?? null
}

export const createQuest = async (
  interaction: CommandInteraction,
  questData: Omit<
    GuildQuest,
    'id' | 'guild_id' | 'created_at' | 'is_claimed' | 'is_pending_claim' | 'thread_id' | 'winner'
  >,
) => {
  try {
    const guildPk = await guildPkByGuildId(interaction.guildId!)
    if (!guildPk) throw new Error('Guild not found')

    const newQuest: GuildQuest = {
      ...questData,
      id: uuidv4(),
      guild_id: guildPk,
      created_at: new Date().toISOString(),
      is_claimed: false,
      is_pending_claim: false,
    }

    await db.insert(guildQuests).values({
      id: newQuest.id,
      guild_id: newQuest.guild_id,
      title: newQuest.title,
      description: newQuest.description,
      question: newQuest.question ?? null,
      answer: newQuest.answer ?? null,
      mode: newQuest.mode,
      winners_count: newQuest.winners_count ?? null,
      reward: newQuest.reward,
      reward_code: newQuest.reward_code ?? null,
      channel_id: newQuest.channel_id,
      thread_id: newQuest.thread_id ?? null,
      message_id: newQuest.message_id ?? null,
      created_by: newQuest.created_by,
      created_at: newQuest.created_at,
      expiration_date: newQuest.expiration_date,
      is_claimed: newQuest.is_claimed,
      is_pending_claim: newQuest.is_pending_claim,
      winner: null,
      winners: null,
    })

    const channel = await interaction.guild!.channels.fetch(questData.channel_id)
    if (!channel?.isTextBased()) throw new Error('Invalid channel')

    const questEmbed = {
      title: `${questData.mode === 'quiz' ? '🎯' : '🎉'} ${newQuest.title}`,
      description: newQuest.description,
      fields: [
        ...(questData.mode === 'quiz'
          ? [{ name: '❓ Question', value: newQuest.question ?? '' }]
          : [
              { name: '🎲 How to Participate', value: 'React with 🎉 to enter the raffle!' },
              {
                name: '👥 Winners',
                value: `${newQuest.winners_count || 1} lucky winner${
                  newQuest.winners_count !== 1 ? 's' : ''
                } will be selected`,
              },
            ]),
        { name: '🎁 Reward', value: newQuest.reward },
        { name: '⏰ Expires', value: new Date(newQuest.expiration_date).toLocaleString() },
      ],
      color: DEFAULT_COLOR,
      footer: { text: `Quest ID: ${newQuest.id}` },
    }

    // Optional: mention a notification role configured in /plugins → Quests.
    const questsCfg = await getPluginConfig(interaction.guildId!, 'quests')
    const notifyRoleId = questsCfg?.enabled ? questsCfg.metadata?.notifyRoleId : undefined

    const questMessage = await channel.send({
      content: notifyRoleId ? `<@&${notifyRoleId}>` : undefined,
      embeds: [questEmbed],
      allowedMentions: notifyRoleId ? { roles: [notifyRoleId] } : { roles: [] },
    })
    if (questData.mode === 'raffle') await questMessage.react('🎉')

    let thread: ThreadChannel | null = null
    if (questData.mode === 'quiz') {
      thread = await questMessage.startThread({
        name: '🎯 Quest: ' + newQuest.title,
        autoArchiveDuration: 1440,
      })
    }

    await db
      .update(guildQuests)
      .set({ thread_id: thread?.id ?? null, message_id: questMessage.id })
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

    const guildPk = await guildPkByGuildId(message.guildId)
    if (!guildPk) return

    const quests = await db.query.guildQuests.findMany({
      where: and(
        eq(guildQuests.guild_id, guildPk),
        eq(guildQuests.mode, 'quiz'),
        eq(guildQuests.is_claimed, false),
        eq(guildQuests.is_pending_claim, false),
        gt(guildQuests.expiration_date, new Date().toISOString()),
      ),
    })
    if (!quests.length) return

    const quest = quests.find((q) => q.thread_id === message.channelId)
    if (!quest) return

    if (quest.answer && message.content.toLowerCase().includes(quest.answer.toLowerCase())) {
      const winner = {
        id: message.author.id,
        username: message.author.username,
        claimed_at: new Date().toISOString(),
        dm_sent: false,
      }
      await db
        .update(guildQuests)
        .set({ is_pending_claim: true, winner })
        .where(eq(guildQuests.id, quest.id))

      let canReceiveDMs = true
      try {
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
      } catch {
        canReceiveDMs = false
      }

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
        await sendQuestReward(message.guildId, quest.id, message.author)
      } else {
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
    const guildPk = await guildPkByGuildId(interaction.guildId!)
    if (!guildPk) return { success: false, message: 'Guild not found.' }

    const quest = await db.query.guildQuests.findFirst({
      where: and(
        eq(guildQuests.guild_id, guildPk),
        eq(guildQuests.is_pending_claim, true),
        sql`${guildQuests.winner}->>'id' = ${interaction.user.id}`,
      ),
    })
    if (!quest) return { success: false, message: 'No pending quest rewards found for you.' }

    return await sendQuestReward(interaction.guildId!, quest.id, interaction.user)
  } catch (error) {
    console.error('Error claiming quest reward:', error)
    return { success: false, message: 'An error occurred while claiming your reward.' }
  }
}

export const sendQuestReward = async (guildId: string, questId: string, user: User) => {
  try {
    const guildPk = await guildPkByGuildId(guildId)
    if (!guildPk) return { success: false, message: 'Guild not found.' }

    const quest = await db.query.guildQuests.findFirst({
      where: and(eq(guildQuests.guild_id, guildPk), eq(guildQuests.id, questId)),
    })
    if (!quest) return { success: false, message: 'Quest not found.' }

    await user.send({
      embeds: [
        {
          title: `🎉 You've won a quest reward!`,
          description: `Congratulations! You've won the "${quest.title}" quest in the server.`,
          fields: [
            { name: 'Reward', value: quest.reward },
            {
              name: 'Reward Code',
              value: quest.reward_code || 'No code provided for this reward.',
            },
          ],
          color: DEFAULT_COLOR,
        },
      ],
    })

    await db
      .update(guildQuests)
      .set({
        is_claimed: true,
        is_pending_claim: false,
        winner: {
          id: quest.winner?.id ?? user.id,
          username: quest.winner?.username ?? user.username,
          claimed_at: quest.winner?.claimed_at ?? new Date().toISOString(),
          dm_sent: true,
          dm_failed: false,
        },
      })
      .where(eq(guildQuests.id, quest.id))

    return { success: true, message: 'Reward sent successfully' }
  } catch (error) {
    console.error('Failed to send DM to winner:', error)

    const questData = await db.query.guildQuests.findFirst({
      where: eq(guildQuests.id, questId),
    })
    if (questData) {
      await db
        .update(guildQuests)
        .set({
          winner: {
            ...(questData.winner ?? {
              id: '',
              username: '',
              claimed_at: new Date().toISOString(),
              dm_sent: false,
            }),
            dm_failed: true,
          },
        })
        .where(eq(guildQuests.id, questId))
    }

    return { success: false, message: 'Failed to send reward DM. Please contact an admin.' }
  }
}

export const getActiveQuests = async (guildId: string) => {
  try {
    const guildPk = await guildPkByGuildId(guildId)
    if (!guildPk) return []
    return await db.query.guildQuests.findMany({
      where: and(eq(guildQuests.guild_id, guildPk), eq(guildQuests.is_claimed, false)),
      orderBy: [desc(guildQuests.created_at)],
    })
  } catch (error) {
    console.error('Error getting active quests:', error)
    return []
  }
}

export const getQuestById = async (guildId: string, questId: string) => {
  try {
    const guildPk = await guildPkByGuildId(guildId)
    if (!guildPk) return null
    const quest = await db.query.guildQuests.findFirst({
      where: and(eq(guildQuests.guild_id, guildPk), eq(guildQuests.id, questId)),
    })
    return quest ?? null
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
    const member = await interaction.guild!.members.fetch(interaction.user.id)
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'You do not have permission to draw winners.' }
    }

    const guildPk = await guildPkByGuildId(interaction.guildId!)
    if (!guildPk) return { success: false, message: 'Guild not found.' }

    const quest = await db.query.guildQuests.findFirst({
      where: and(eq(guildQuests.guild_id, guildPk), eq(guildQuests.id, questId)),
    })
    if (!quest) return { success: false, message: 'Quest not found.' }
    if (quest.mode !== 'raffle') return { success: false, message: 'This quest is not a raffle.' }
    if (quest.is_claimed || quest.is_pending_claim) {
      return {
        success: false,
        message: 'This quest has already been claimed or is pending claim.',
      }
    }

    const channel = await interaction.guild!.channels.fetch(quest.channel_id)
    if (!channel?.isTextBased()) return { success: false, message: 'Invalid channel' }

    if (!quest.message_id) return { success: false, message: 'Quest message not found' }
    const message = await channel.messages.fetch(quest.message_id)
    if (!message) return { success: false, message: 'Quest message not found' }

    const reaction = message.reactions.cache.get('🎉')
    if (!reaction) return { success: false, message: 'No participants found' }

    await reaction.users.fetch()
    const participants = Array.from(reaction.users.cache.values()).filter((u) => !u.bot)
    if (participants.length === 0) return { success: false, message: 'No participants found' }

    const winnersCount = Math.min(quest.winners_count || 1, participants.length)
    const winners: NonNullable<GuildQuest['winners']> = []
    const rewardCodes = quest.reward_code
      ? quest.reward_code.split(',').map((code) => code.trim())
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

    await db
      .update(guildQuests)
      .set({ is_pending_claim: true, winners })
      .where(eq(guildQuests.id, quest.id))

    const thread = quest.thread_id
      ? await interaction.guild!.channels.fetch(quest.thread_id)
      : null
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
    if (thread?.isThread()) await thread.send({ embeds: [announcementEmbed] })

    if (rewardCodes.length > 0) {
      for (const winner of winners) {
        try {
          const user = await interaction.guild!.members.fetch(winner.id)
          await user.send({
            embeds: [
              {
                title: '🎁 Quest Reward',
                description: `Congratulations on winning the quest "${quest.title}"!`,
                fields: [
                  { name: 'Reward Description', value: quest.reward },
                  {
                    name: 'Your Reward Code',
                    value: winner.reward_code || 'No code provided for this reward.',
                  },
                ],
                color: DEFAULT_COLOR,
              },
            ],
          })
          winner.dm_sent = true
        } catch (error) {
          console.error(`Failed to send DM to winner ${winner.username}:`, error)
          winner.dm_failed = true
        }
      }
      await db.update(guildQuests).set({ winners }).where(eq(guildQuests.id, quest.id))
    }

    return {
      success: true,
      message: `Successfully drew ${winners.length} winner(s) for the quest.`,
    }
  } catch (error) {
    console.error('Error drawing quest winners:', error)
    return { success: false, message: 'An error occurred while drawing winners.' }
  }
}
