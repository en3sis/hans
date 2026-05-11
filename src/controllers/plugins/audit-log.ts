/**
 * Shared renderer for the Message Audit Log (`serverMessagesLogs` plugin).
 *
 * Uses v2 Container components so the audit log feels consistent with the
 * admin panel — a small accent strip on the left + structured sections.
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  Message,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextChannel,
  TextDisplayBuilder,
} from 'discord.js'

const COLOR_EDIT = 0x3165ae
const COLOR_DELETE = 0xa8102d
const MAX_BLOCK_CHARS = 1000

const formatContent = (raw: string | null | undefined): string => {
  if (!raw) return '_(content not cached — older than the bot’s message memory)_'
  const trimmed = raw.length > MAX_BLOCK_CHARS ? `${raw.slice(0, MAX_BLOCK_CHARS - 1)}…` : raw
  // Escape triple backticks so user content can't break out of the code fence.
  const safe = trimmed.replace(/```/g, '`​``')
  return '```\n' + safe + '\n```'
}

const headerLine = (message: Message): string => {
  const author = message.author
    ? `<@${message.author.id}>`
    : '_unknown user_'
  const channel = `<#${message.channel.id}>`
  const when = `<t:${Math.floor(Date.now() / 1000)}:R>`
  return `${author} · ${channel} · ${when}`
}

export const postEditLog = async (
  channel: TextChannel,
  oldMessage: Message,
  newMessage: Message,
): Promise<void> => {
  const container = new ContainerBuilder().setAccentColor(COLOR_EDIT)
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ✏️  Message edited\n${headerLine(newMessage)}`),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Before**\n${formatContent(oldMessage.content)}`),
  )
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**After**\n${formatContent(newMessage.content)}`),
  )
  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Jump to message')
        .setStyle(ButtonStyle.Link)
        .setURL(newMessage.url),
    ),
  )

  await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  })
}

export const postDeleteLog = async (
  channel: TextChannel,
  message: Message,
): Promise<void> => {
  const container = new ContainerBuilder().setAccentColor(COLOR_DELETE)
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## 🗑️  Message deleted\n${headerLine(message)}`),
  )
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
  )
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Content**\n${formatContent(message.content)}`),
  )

  await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  })
}
