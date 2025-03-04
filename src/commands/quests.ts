import { SlashCommandBuilder } from '@discordjs/builders'
import {
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  PermissionFlagsBits,
} from 'discord.js'
import {
  claimQuestReward,
  createQuest,
  getActiveQuests,
  getQuestById,
} from '../controllers/plugins/quests.controller'
import { logger } from '../utils/debugging'

module.exports = {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('Manage server quests')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new quest')
        .addStringOption((option) =>
          option.setName('title').setDescription('Title of the quest').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('Description of the quest')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('question')
            .setDescription('The question to be answered')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('answer').setDescription('The correct answer').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('reward_description')
            .setDescription('Public description of the reward (visible to everyone)')
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to post the quest in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('reward_code')
            .setDescription('The actual reward code (sent privately via DM)')
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName('expiration_days')
            .setDescription('Number of days until the quest expires')
            .setMinValue(1)
            .setMaxValue(30),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List all active quests'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Get information about a specific quest')
        .addStringOption((option) =>
          option.setName('quest_id').setDescription('ID of the quest').setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('claim').setDescription('Claim rewards for quests you have completed'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      try {
        await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        })
      } catch (error) {
        console.error('Failed to reply with guild check:', error)
      }
      return
    }

    // Get subcommand
    const subcommand = interaction.options.getSubcommand()

    // Check permissions for admin commands
    if (
      ['create', 'info'].includes(subcommand) &&
      !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      try {
        await interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true,
        })
      } catch (error) {
        console.error('Failed to reply with permission check:', error)
      }
      return
    }

    // Process the subcommand - no need to defer as it's handled at the interactionCreate level
    try {
      switch (subcommand) {
        case 'create': {
          const title = interaction.options.getString('title', true)
          const description = interaction.options.getString('description', true)
          const question = interaction.options.getString('question', true)
          const answer = interaction.options.getString('answer', true)
          const rewardDescription = interaction.options.getString('reward_description', true)
          const rewardCode = interaction.options.getString('reward_code')
          const channel = interaction.options.getChannel('channel', true)
          const expirationDays = interaction.options.getInteger('expiration_days') || 7

          const expirationDate = new Date()
          expirationDate.setDate(expirationDate.getDate() + expirationDays)

          const thread = await createQuest(interaction, {
            title,
            description,
            question,
            answer,
            reward: rewardDescription,
            reward_code: rewardCode || rewardDescription,
            channel_id: channel.id,
            created_by: interaction.user.id,
            expiration_date: expirationDate.toISOString(),
          })

          await interaction.editReply({
            content: `Quest created successfully! Thread: ${thread.url}`,
          })
          break
        }

        case 'list': {
          const quests = await getActiveQuests(interaction.guildId)

          if (quests.length === 0) {
            await interaction.editReply({
              content: 'There are no active quests at the moment.',
            })
            break
          }

          const questList = quests
            .map((quest) => {
              const expiresIn = Math.ceil(
                (new Date(quest.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )
              return `- **${quest.title}** (ID: \`${quest.id}\`) - Expires in ${expiresIn} days`
            })
            .join('\n')

          await interaction.editReply({
            embeds: [
              {
                title: '🎯 Active Quests',
                description: questList,
                color: 0x00ff00,
              },
            ],
          })
          break
        }

        case 'info': {
          const questId = interaction.options.getString('quest_id', true)
          const quest = await getQuestById(interaction.guildId, questId)

          if (!quest) {
            await interaction.editReply({
              content: 'Quest not found.',
            })
            break
          }

          const channel = await interaction.guild.channels.fetch(quest.channel_id)
          const thread = quest.thread_id
            ? await interaction.guild.channels.fetch(quest.thread_id)
            : null

          const statusText = quest.is_claimed
            ? '✅ Completed'
            : quest.is_pending_claim
              ? '🟡 Pending Claim'
              : '🔵 Active'

          await interaction.editReply({
            embeds: [
              {
                title: `Quest Info: ${quest.title}`,
                description: quest.description,
                fields: [
                  {
                    name: 'Status',
                    value: statusText,
                    inline: true,
                  },
                  {
                    name: 'Channel',
                    value: channel ? `<#${channel.id}>` : 'Unknown',
                    inline: true,
                  },
                  {
                    name: 'Thread',
                    value: thread ? `[View Thread](${(thread as any).url})` : 'N/A',
                    inline: true,
                  },
                  {
                    name: 'Expires',
                    value: new Date(quest.expiration_date).toLocaleString(),
                    inline: true,
                  },
                  {
                    name: 'Created By',
                    value: `<@${quest.created_by}>`,
                    inline: true,
                  },
                  {
                    name: 'Winner',
                    value: quest.winner ? `<@${quest.winner.id}>` : 'None yet',
                    inline: true,
                  },
                ],
                color: quest.is_claimed ? 0x00ff00 : quest.is_pending_claim ? 0xffcc00 : 0x0099ff,
              },
            ],
          })
          break
        }

        case 'claim': {
          const result = await claimQuestReward(interaction)

          await interaction.editReply({
            embeds: [
              {
                title: result.success ? '🎁 Quest Rewards Claimed' : '❌ Claim Failed',
                description: result.message,
                color: result.success ? 0x00ff00 : 0xff0000,
                fields: result.success
                  ? []
                  : [
                      {
                        name: 'How to enable DMs',
                        value:
                          '1. Right-click on the server icon\n2. Select "Privacy Settings"\n3. Enable "Direct Messages"\n4. Try `/quests claim` again',
                      },
                    ],
              },
            ],
          })
          break
        }
      }
    } catch (error) {
      console.error('❌ ERROR: Command: quests: ', error)
      try {
        await interaction.editReply({
          content: 'An error occurred while executing this command.',
        })
      } catch (replyError) {
        console.error('Failed to send error message:', replyError)
      }
    }
  },
}
