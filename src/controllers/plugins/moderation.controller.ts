import { ChatInputCommandInteraction, Message, TextChannel } from 'discord.js'
import { RemoveLinksMetadata } from '../../types/plugins'

export const purgeMessages = async (interaction: ChatInputCommandInteraction) => {
  try {
    const amount = interaction.options.get('n')!.value as number

    if (!interaction.memberPermissions!.has(['Administrator']))
      return interaction.editReply({
        content: 'You do not have permission to use this command',
      })

    if (amount > 100) {
      return interaction.editReply({
        content: 'You can only delete up to 100 messages at once.',
      })
    }

    const fetched = await (interaction.channel as TextChannel)!.messages.fetch({
      limit: amount,
    })

    await (interaction.channel as TextChannel)!.bulkDelete(fetched).catch(async (err: any) => {
      await interaction.editReply({ content: err.message })
    })

    await interaction.editReply({ content: `🗑 Deleted ${amount} messages.` })
  } catch (error) {
    throw Error(error.message)
  }
}

// Match URLs in a message body. Catches https?://… and bare www.something.
const URL_PATTERN =
  /\b((?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s<>"']*)/gi

/** Compile an allow-pattern line into a regex. */
const compileAllowed = (line: string): RegExp | null => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  try {
    // Lines that look like regex (start with anchor or contain regex
    // metacharacters) are used as-is; everything else is treated as a
    // bare hostname suffix (e.g. github.com matches gist.github.com).
    const looksLikeRegex = /[\^$*+?()[\]{}|\\]/.test(trimmed)
    if (looksLikeRegex) return new RegExp(trimmed, 'i')
    const escaped = trimmed.replace(/\./g, '\\.')
    return new RegExp(`(?:^|//|\\.)${escaped}(?:[/:?#]|$)`, 'i')
  } catch {
    return null
  }
}

/**
 * Delete a message that contains links unless: (a) author has elevated
 * permissions or any bypass role, or (b) every URL in the message
 * matches an entry in `allowedUrls`.
 */
export const removeLinks = async (
  message: Message,
  metadata: RemoveLinksMetadata | null | undefined,
): Promise<void> => {
  if (!message.member) return
  if (
    message.member.permissions.has(['Administrator']) ||
    message.member.permissions.has(['ManageMessages'])
  ) {
    return
  }

  const bypassRoles = metadata?.allowedRoles ?? []
  if (bypassRoles.some((id) => message.member!.roles.cache.has(id))) return

  const urls = message.content.match(URL_PATTERN)
  if (!urls || urls.length === 0) return

  const allowed = (metadata?.allowedUrls ?? '')
    .split('\n')
    .map(compileAllowed)
    .filter((re): re is RegExp => re !== null)

  const everyUrlAllowed = urls.every((url) => allowed.some((re) => re.test(url)))
  if (everyUrlAllowed) return

  try {
    await message.delete()
  } catch (err) {
    console.error('❌ removeLinks: failed to delete message:', err)
  }
}

