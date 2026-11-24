import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js'
import { Hans } from '../..'
import { RemoveLinksMetadata } from '../../types/plugins'
import { log } from '../../utils/log'
import { reportErrorToMonitoring } from '../../utils/monitoring'

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

    await (interaction.channel as TextChannel)!.bulkDelete(fetched).catch(async (err: Error) => {
      await interaction.editReply({ content: err.message })
    })

    await interaction.editReply({ content: `🗑 Deleted ${amount} messages.` })
  } catch (error) {
    throw Error(error.message)
  }
}

const LINK_RULE_NAME = 'Hans · Link Removal'
const LINK_PATTERNS = [String.raw`(?i)(?:https?://|www\.)[^\s<>"']+`]
const MAX_EXEMPT_ROLES = 20
const MAX_ALLOW_LIST = 100
const MAX_ALLOW_ENTRY_LENGTH = 60

const toAllowList = (allowedUrls: string | undefined): string[] =>
  (allowedUrls ?? '')
    .split('\n')
    .map((line) => line.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, ''))
    .filter((line) => line && !line.startsWith('#') && !/[\^$*+?()[\]{}|\\\s]/.test(line))
    .map((host) => `*${host}*`)
    .filter((entry) => entry.length <= MAX_ALLOW_ENTRY_LENGTH)
    .slice(0, MAX_ALLOW_LIST)

/**
 * Mirrors the Link Removal plugin onto a Discord AutoMod rule, which blocks
 * links without the bot needing the Message Content intent.
 */
export const syncLinkRemovalRule = async (
  guildId: string,
  enabled: boolean,
  metadata: RemoveLinksMetadata | null | undefined,
): Promise<void> => {
  try {
    const guild = await Hans.guilds.fetch(guildId)
    const rules = await guild.autoModerationRules.fetch()
    const existing = rules.find((r) => r.name === LINK_RULE_NAME && r.creatorId === Hans.user?.id)

    if (!enabled) {
      if (existing) await existing.delete('Link Removal disabled in Hans')
      return
    }

    const options = {
      name: LINK_RULE_NAME,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerMetadata: {
        regexPatterns: LINK_PATTERNS,
        allowList: toAllowList(metadata?.allowedUrls),
      },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: { customMessage: 'Links are not allowed in this server.' },
        },
      ],
      enabled: true,
      exemptRoles: (metadata?.allowedRoles ?? []).slice(0, MAX_EXEMPT_ROLES),
    }

    if (existing) await existing.edit(options)
    else
      await guild.autoModerationRules.create({
        ...options,
        triggerType: AutoModerationRuleTriggerType.Keyword,
      })
  } catch (error) {
    log.error(`❌ syncLinkRemovalRule(${guildId}):`, error)
    reportErrorToMonitoring({
      embeds: {
        title: 'Link Removal: AutoMod sync failed',
        description: `Guild ${guildId}: ${(error as Error).message}`,
      },
    }).catch(() => {})
  }
}

