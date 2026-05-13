/**
 * Quests sub-system within the plugin panel.
 *
 * Quests are domain entities (rows in `guild_quests`), not plugin settings,
 * so they sit *next to* the schema-driven panel rather than inside it:
 *
 *  - "Create new quest" (panel custom action) → opens a draft wizard message.
 *  - "Manage quests" (panel custom action)   → opens the active-quests list.
 *
 * Both render their own ephemeral messages with the `quest:*` custom_id
 * namespace, routed from interactionCreate.ts. The schema-driven panel
 * never sees these interactions.
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ContainerBuilder,
  Interaction,
  LabelBuilder,
  MessageComponentInteraction,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import {
  createQuest,
  drawQuestWinners,
  getActiveQuests,
  getQuestById,
} from '../../controllers/plugins/quests.controller'
import { db } from '../../db/client'
import { guildQuests } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { deleteFromCache, getFromCache, setToCache } from '../../libs/node-cache'

const DRAFT_TTL_MINUTES = 15
const PANEL_FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral

type QuestMode = 'quiz' | 'raffle'

interface QuestDraft {
  title?: string
  description?: string
  rewardDescription?: string
  mode?: QuestMode
  channelId?: string
  question?: string
  answer?: string
  rewardCode?: string
  winnersCount?: number
  expirationDays?: number
}

const draftKey = (guildId: string, userId: string) => `questDraft:${guildId}:${userId}`

const loadDraft = (guildId: string, userId: string): QuestDraft => {
  const raw = getFromCache(draftKey(guildId, userId))
  return raw && typeof raw === 'object' ? (raw as QuestDraft) : {}
}

const saveDraft = (guildId: string, userId: string, draft: QuestDraft) =>
  setToCache(draftKey(guildId, userId), draft, DRAFT_TTL_MINUTES)

const clearDraft = (guildId: string, userId: string) =>
  deleteFromCache(draftKey(guildId, userId))

/* -------------------------------------------------------------------------- */
/* Wizard renderer                                                             */
/* -------------------------------------------------------------------------- */

const renderWizard = (draft: QuestDraft) => {
  const container = new ContainerBuilder()

  const tick = (ok: boolean) => (ok ? '✅' : '⬜')
  const basicsComplete = Boolean(draft.title && draft.description && draft.rewardDescription)
  const modeDetailsComplete =
    draft.mode === 'quiz'
      ? Boolean(draft.question && draft.answer)
      : draft.mode === 'raffle'
        ? Boolean(draft.winnersCount && draft.winnersCount >= 1)
        : false

  const lines: string[] = []
  lines.push(`${tick(!!draft.title)} **Title** — ${draft.title ?? '_not set_'}`)
  lines.push(
    `${tick(!!draft.description)} **Description** — ${
      draft.description ? truncate(draft.description, 120) : '_not set_'
    }`,
  )
  lines.push(`${tick(!!draft.rewardDescription)} **Reward** — ${draft.rewardDescription ?? '_not set_'}`)
  lines.push(
    `${tick(!!draft.mode)} **Mode** — ${
      draft.mode ? (draft.mode === 'quiz' ? '🎯 Quiz' : '🎉 Raffle') : '_not set_'
    }`,
  )
  lines.push(`${tick(!!draft.channelId)} **Channel** — ${draft.channelId ? `<#${draft.channelId}>` : '_not set_'}`)
  lines.push(`-# ⏰ Expires in ${draft.expirationDays ?? 7} day(s)`)
  if (draft.mode === 'quiz') {
    lines.push(
      `${tick(!!draft.question)} **Question** — ${draft.question ? truncate(draft.question, 80) : '_not set_'}`,
    )
    lines.push(`${tick(!!draft.answer)} **Answer** — ${draft.answer ? '••• (hidden)' : '_not set_'}`)
  } else if (draft.mode === 'raffle') {
    lines.push(`${tick(!!draft.winnersCount)} **Winners** — ${draft.winnersCount ?? 1}`)
  }
  if (draft.rewardCode) {
    lines.push(`-# 🎟️ Reward code(s) set: ${truncate(draft.rewardCode, 80)}`)
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 🏆 Create new quest\nFill the fields below, then **Create**.'),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))

  container.addActionRowComponents(
    new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('quest:wiz:channel')
        .setPlaceholder('Channel where the quest is posted')
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1)
        .setDefaultChannels(draft.channelId ? [draft.channelId] : []),
    ),
  )
  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('quest:wiz:mode')
        .setPlaceholder('Mode')
        .addOptions(
          {
            label: 'Quiz · answer a question',
            value: 'quiz',
            description: 'First member with the correct answer wins.',
            default: draft.mode === 'quiz',
          },
          {
            label: 'Raffle · react to enter',
            value: 'raffle',
            description: 'Members react with 🎉, you draw winners.',
            default: draft.mode === 'raffle',
          },
        ),
    ),
  )

  const modeDetailLabel =
    draft.mode === 'quiz'
      ? '🎯 Quiz Q&A'
      : draft.mode === 'raffle'
        ? '🎉 Raffle setup'
        : 'Mode details — pick a mode first'

  // Highlight the next incomplete step as Primary so the user knows where to
  // click next. Once everything's filled, the Create button is the only
  // green action and there's no Primary at all (so it visually wins).
  const nextStep: 'basics' | 'mode' | null = !basicsComplete
    ? 'basics'
    : draft.mode && !modeDetailsComplete
      ? 'mode'
      : null

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('quest:wiz:editBasics')
        .setLabel('📝 Basics')
        .setStyle(nextStep === 'basics' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('quest:wiz:editMode')
        .setLabel(modeDetailLabel)
        .setStyle(nextStep === 'mode' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!draft.mode),
      new ButtonBuilder()
        .setCustomId('quest:wiz:create')
        .setLabel('Create quest')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('quest:wiz:cancel')
        .setLabel('Discard')
        .setStyle(ButtonStyle.Danger),
    ),
  )

  return { flags: PANEL_FLAGS, components: [container] }
}

/* -------------------------------------------------------------------------- */
/* List renderer                                                               */
/* -------------------------------------------------------------------------- */

const renderQuestList = async (guildId: string) => {
  const quests = await getActiveQuests(guildId)
  const container = new ContainerBuilder()
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🏆 Active quests\n${quests.length} active quest${quests.length === 1 ? '' : 's'}.`,
    ),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )

  if (quests.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('_None right now. Use **Create new quest** from the panel._'),
    )
  } else {
    // Cap at 8 to keep under the 40-component budget.
    const visible = quests.slice(0, 8)
    for (const quest of visible) {
      const days = Math.ceil(
        (new Date(quest.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      const status = quest.is_claimed
        ? '✅ Completed'
        : quest.is_pending_claim
          ? '🟡 Pending claim'
          : '🔵 Active'
      const modeIcon = quest.mode === 'quiz' ? '🎯' : '🎉'
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${modeIcon} **${quest.title}** · ${status}\n-# <#${quest.channel_id}> · expires in ${days}d · \`${quest.id.slice(0, 8)}\``,
        ),
      )
      const buttons: ButtonBuilder[] = [
        new ButtonBuilder()
          .setCustomId(`quest:info:${quest.id}`)
          .setLabel('Info')
          .setStyle(ButtonStyle.Secondary),
      ]
      if (quest.mode === 'raffle' && !quest.winners?.length) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`quest:draw:${quest.id}`)
            .setLabel('Draw winners')
            .setStyle(ButtonStyle.Primary),
        )
      }
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`quest:cancel:${quest.id}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger),
      )
      container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons))
    }
    if (quests.length > visible.length) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# +${quests.length - visible.length} more — only the most recent are shown.`,
        ),
      )
    }
  }

  return { flags: PANEL_FLAGS, components: [container] }
}

/* -------------------------------------------------------------------------- */
/* Modal builders                                                              */
/* -------------------------------------------------------------------------- */

const basicsModal = (draft: QuestDraft): ModalBuilder => {
  const modal = new ModalBuilder()
    .setCustomId('quest:wiz:basics')
    .setTitle('Quest — basics')
  const title = new TextInputBuilder()
    .setCustomId('title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256)
  if (draft.title) title.setValue(draft.title)
  const description = new TextInputBuilder()
    .setCustomId('description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
  if (draft.description) description.setValue(draft.description)
  const reward = new TextInputBuilder()
    .setCustomId('rewardDescription')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1024)
    .setPlaceholder('What the winner gets — visible to everyone.')
  if (draft.rewardDescription) reward.setValue(draft.rewardDescription)
  const expiration = new TextInputBuilder()
    .setCustomId('expirationDays')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(2)
    .setPlaceholder('Days until expiration (default 7, max 30).')
  if (draft.expirationDays) expiration.setValue(String(draft.expirationDays))

  modal.addLabelComponents(
    new LabelBuilder().setLabel('Title').setTextInputComponent(title),
    new LabelBuilder().setLabel('Description').setTextInputComponent(description),
    new LabelBuilder().setLabel('Reward description').setTextInputComponent(reward),
    new LabelBuilder().setLabel('Expires in days').setTextInputComponent(expiration),
  )
  return modal
}

const quizModal = (draft: QuestDraft): ModalBuilder => {
  const modal = new ModalBuilder().setCustomId('quest:wiz:quiz').setTitle('Quest — quiz')
  const question = new TextInputBuilder()
    .setCustomId('question')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
  if (draft.question) question.setValue(draft.question)
  const answer = new TextInputBuilder()
    .setCustomId('answer')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200)
    .setPlaceholder('The correct answer (case-insensitive substring match).')
  if (draft.answer) answer.setValue(draft.answer)
  const rewardCode = new TextInputBuilder()
    .setCustomId('rewardCode')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Sent via DM to the winner. Leave empty for description-only.')
  if (draft.rewardCode) rewardCode.setValue(draft.rewardCode)

  modal.addLabelComponents(
    new LabelBuilder().setLabel('Question').setTextInputComponent(question),
    new LabelBuilder().setLabel('Answer').setTextInputComponent(answer),
    new LabelBuilder().setLabel('Reward code (optional)').setTextInputComponent(rewardCode),
  )
  return modal
}

const raffleModal = (draft: QuestDraft): ModalBuilder => {
  const modal = new ModalBuilder().setCustomId('quest:wiz:raffle').setTitle('Quest — raffle')
  const winners = new TextInputBuilder()
    .setCustomId('winnersCount')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(2)
    .setPlaceholder('How many winners (1–10).')
  winners.setValue(String(draft.winnersCount ?? 1))
  const rewardCode = new TextInputBuilder()
    .setCustomId('rewardCode')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000)
    .setPlaceholder('Comma-separated codes — must match winner count, or leave empty for none.')
  if (draft.rewardCode) rewardCode.setValue(draft.rewardCode)

  modal.addLabelComponents(
    new LabelBuilder().setLabel('Winners count').setTextInputComponent(winners),
    new LabelBuilder().setLabel('Reward codes (optional)').setTextInputComponent(rewardCode),
  )
  return modal
}

/* -------------------------------------------------------------------------- */
/* Entry points (called from custom actions)                                   */
/* -------------------------------------------------------------------------- */

export const openCreateWizard = async (
  interaction: MessageComponentInteraction,
  guildId: string,
): Promise<void> => {
  const draft = loadDraft(guildId, interaction.user.id)
  await interaction.followUp(renderWizard(draft))
}

export const openQuestList = async (
  interaction: MessageComponentInteraction,
  guildId: string,
): Promise<void> => {
  await interaction.followUp(await renderQuestList(guildId))
}

/* -------------------------------------------------------------------------- */
/* Dispatcher                                                                  */
/* -------------------------------------------------------------------------- */

export const isQuestInteraction = (id: string): boolean => id.startsWith('quest:')

export const handleQuestInteraction = async (interaction: Interaction): Promise<boolean> => {
  if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) return false
  const customId = interaction.customId
  if (!isQuestInteraction(customId)) return false
  if (!interaction.guildId) return true
  if (!interaction.memberPermissions?.has(['ManageGuild'])) {
    await replyError(interaction, 'You do not have permission to manage quests.')
    return true
  }

  try {
    await dispatch(interaction, customId)
  } catch (err) {
    console.error('❌ quest interaction error:', err)
    await replyError(interaction, err instanceof Error ? err.message : 'Unexpected error.')
  }
  return true
}

const dispatch = async (
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  customId: string,
): Promise<void> => {
  const parts = customId.split(':')
  const guildId = interaction.guildId!
  const userId = interaction.user.id

  if (interaction.isChannelSelectMenu() && customId === 'quest:wiz:channel') {
    const draft = loadDraft(guildId, userId)
    draft.channelId = interaction.values[0]
    saveDraft(guildId, userId, draft)
    return safeUpdate(interaction, renderWizard(draft))
  }

  if (interaction.isStringSelectMenu() && customId === 'quest:wiz:mode') {
    const draft = loadDraft(guildId, userId)
    draft.mode = interaction.values[0] as QuestMode
    saveDraft(guildId, userId, draft)
    return safeUpdate(interaction, renderWizard(draft))
  }

  if (interaction.isButton()) {
    switch (customId) {
      case 'quest:wiz:editBasics':
        return interaction.showModal(basicsModal(loadDraft(guildId, userId)))
      case 'quest:wiz:editMode': {
        const draft = loadDraft(guildId, userId)
        if (draft.mode === 'quiz') return interaction.showModal(quizModal(draft))
        if (draft.mode === 'raffle') return interaction.showModal(raffleModal(draft))
        return replyError(interaction, 'Pick a mode first.')
      }
      case 'quest:wiz:cancel':
        clearDraft(guildId, userId)
        return safeUpdate(interaction, {
          flags: PANEL_FLAGS,
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent('🗑️  Draft discarded.'),
            ),
          ],
        })
      case 'quest:wiz:create':
        return finalizeWizard(interaction)
    }

    if (parts[1] === 'info') return showQuestInfo(interaction, parts.slice(2).join(':'))
    if (parts[1] === 'draw') return runDrawWinners(interaction, parts.slice(2).join(':'))
    if (parts[1] === 'cancel') return cancelQuest(interaction, parts.slice(2).join(':'))
    if (parts[1] === 'back' && parts[2] === 'list')
      return safeUpdate(interaction, await renderQuestList(guildId))
  }

  if (interaction.isModalSubmit()) {
    const draft = loadDraft(guildId, userId)
    switch (customId) {
      case 'quest:wiz:basics': {
        draft.title = interaction.fields.getTextInputValue('title').trim()
        draft.description = interaction.fields.getTextInputValue('description').trim()
        draft.rewardDescription = interaction.fields.getTextInputValue('rewardDescription').trim()
        const exp = interaction.fields.getTextInputValue('expirationDays').trim()
        if (exp) {
          const n = Number(exp)
          if (Number.isFinite(n) && n > 0 && n <= 30) draft.expirationDays = n
        }
        saveDraft(guildId, userId, draft)
        return safeUpdate(interaction, renderWizard(draft))
      }
      case 'quest:wiz:quiz': {
        draft.question = interaction.fields.getTextInputValue('question').trim()
        draft.answer = interaction.fields.getTextInputValue('answer').trim()
        const rc = interaction.fields.getTextInputValue('rewardCode').trim()
        draft.rewardCode = rc || undefined
        saveDraft(guildId, userId, draft)
        return safeUpdate(interaction, renderWizard(draft))
      }
      case 'quest:wiz:raffle': {
        const w = Number(interaction.fields.getTextInputValue('winnersCount'))
        draft.winnersCount = Number.isFinite(w) && w >= 1 && w <= 10 ? w : 1
        const rc = interaction.fields.getTextInputValue('rewardCode').trim()
        draft.rewardCode = rc || undefined
        saveDraft(guildId, userId, draft)
        return safeUpdate(interaction, renderWizard(draft))
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Final create flow                                                           */
/* -------------------------------------------------------------------------- */

const finalizeWizard = async (interaction: ButtonInteraction): Promise<void> => {
  const guildId = interaction.guildId!
  const userId = interaction.user.id
  const draft = loadDraft(guildId, userId)

  const errors: string[] = []
  if (!draft.title) errors.push('Title is required.')
  if (!draft.description) errors.push('Description is required.')
  if (!draft.rewardDescription) errors.push('Reward description is required.')
  if (!draft.mode) errors.push('Mode is required.')
  if (!draft.channelId) errors.push('Channel is required.')
  if (draft.mode === 'quiz' && (!draft.question || !draft.answer))
    errors.push('Quiz questions need both a question and an answer.')
  if (draft.mode === 'raffle' && draft.rewardCode) {
    const codes = draft.rewardCode.split(',').map((c) => c.trim()).filter(Boolean)
    const expected = draft.winnersCount ?? 1
    if (codes.length !== expected) {
      errors.push(`Provide exactly ${expected} comma-separated reward codes, or leave empty.`)
    }
  }
  if (errors.length > 0) {
    return replyError(interaction, errors.join('\n'))
  }

  const expirationDays = draft.expirationDays ?? 7
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + expirationDays)

  // The legacy createQuest helper expects a CommandInteraction-ish caller. It
  // only uses .guild and .guildId, both present on ButtonInteraction too — but
  // its TypeScript signature is too narrow. Cast at the boundary.
  const result = await createQuest(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interaction as any,
    {
      title: draft.title!,
      description: draft.description!,
      question: draft.question,
      answer: draft.answer,
      mode: draft.mode!,
      winners_count: draft.mode === 'raffle' ? (draft.winnersCount ?? 1) : undefined,
      reward: draft.rewardDescription!,
      reward_code: draft.rewardCode || draft.rewardDescription!,
      channel_id: draft.channelId!,
      created_by: userId,
      expiration_date: expirationDate.toISOString(),
    },
  )

  clearDraft(guildId, userId)
  const container = new ContainerBuilder()
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ✅ Quest created\n[Jump to message](${result.url}) · Use **Manage quests** to draw winners or cancel.`,
    ),
  )
  return safeUpdate(interaction, { flags: PANEL_FLAGS, components: [container] })
}

/* -------------------------------------------------------------------------- */
/* Quest list actions                                                          */
/* -------------------------------------------------------------------------- */

const showQuestInfo = async (interaction: ButtonInteraction, questId: string): Promise<void> => {
  const quest = await getQuestById(interaction.guildId!, questId)
  if (!quest) return replyError(interaction, 'Quest not found.')

  const status = quest.is_claimed
    ? '✅ Completed'
    : quest.is_pending_claim
      ? '🟡 Pending claim'
      : '🔵 Active'
  const lines = [
    `**Status:** ${status}`,
    `**Mode:** ${quest.mode === 'quiz' ? '🎯 Quiz' : '🎉 Raffle'}`,
    `**Channel:** <#${quest.channel_id}>`,
    `**Created by:** <@${quest.created_by}>`,
    `**Expires:** <t:${Math.floor(new Date(quest.expiration_date).getTime() / 1000)}:R>`,
    `**Reward:** ${quest.reward}`,
  ]
  if (quest.mode === 'quiz' && quest.question) lines.push(`**Question:** ${quest.question}`)
  if (quest.mode === 'raffle' && quest.winners_count)
    lines.push(`**Winners:** ${quest.winners?.length ?? 0} / ${quest.winners_count}`)
  if (quest.winner) lines.push(`**Winner:** <@${quest.winner.id}>`)
  if (quest.winners?.length)
    lines.push(`**Winners:** ${quest.winners.map((w) => `<@${w.id}>`).join(', ')}`)

  const container = new ContainerBuilder()
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${quest.title}\n${quest.description}`),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('quest:back:list')
        .setLabel('← Back to list')
        .setStyle(ButtonStyle.Secondary),
    ),
  )
  return safeUpdate(interaction, { flags: PANEL_FLAGS, components: [container] })
}

const runDrawWinners = async (interaction: ButtonInteraction, questId: string): Promise<void> => {
  const quest = await getQuestById(interaction.guildId!, questId)
  if (!quest) return replyError(interaction, 'Quest not found.')
  if (quest.mode !== 'raffle') return replyError(interaction, 'Only raffle quests can have winners drawn.')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await drawQuestWinners(interaction as any, questId)
  await interaction.followUp({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    flags: MessageFlags.Ephemeral,
  })
  return safeUpdate(interaction, await renderQuestList(interaction.guildId!))
}

const cancelQuest = async (interaction: ButtonInteraction, questId: string): Promise<void> => {
  const quest = await getQuestById(interaction.guildId!, questId)
  if (!quest) return replyError(interaction, 'Quest not found.')
  await db.delete(guildQuests).where(eq(guildQuests.id, questId))
  await interaction.followUp({
    content: `🗑️  Quest **${quest.title}** cancelled.`,
    flags: MessageFlags.Ephemeral,
  })
  return safeUpdate(interaction, await renderQuestList(interaction.guildId!))
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const truncate = (s: string, n: number): string => (s.length <= n ? s : `${s.slice(0, n - 1)}…`)

/** Update the source message of a component or modal-submit interaction. */
const safeUpdate = async (
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  payload: { flags?: number; components: ContainerBuilder[] },
): Promise<void> => {
  if (interaction.isMessageComponent()) {
    await interaction.update({ components: payload.components })
    return
  }
  if (interaction.isModalSubmit() && interaction.isFromMessage()) {
    await interaction.update({ components: payload.components })
    return
  }
  // Modal not from message — fall back to editReply (best effort).
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ components: payload.components })
  }
}

const replyError = async (
  interaction:
    | MessageComponentInteraction
    | ModalSubmitInteraction
    | ButtonInteraction
    | ChannelSelectMenuInteraction
    | StringSelectMenuInteraction,
  message: string,
) => {
  const content = `❌ ${message}`
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {})
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {})
  }
}
