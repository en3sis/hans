/**
 * Plugin-specific custom actions.
 *
 * The panel system itself is data-driven and has no plugin-specific code.
 * Anything that can't be expressed as a field (e.g. "post a message to
 * this channel") lives here, dispatched by `pn:act:<plugin>:<id>`.
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageComponentInteraction,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextChannel,
  TextDisplayBuilder,
} from 'discord.js'
import { getPluginConfig } from '../../controllers/bot/plugins.controller'
import { PluginName } from '../../models/plugins.model'
import { openCreateWizard, openQuestList } from './quests-flow'

export interface CustomActionContext {
  interaction: MessageComponentInteraction
  guildId: string
}

/** Returning an empty `message` suppresses the success follow-up — use when the
 * handler already opened its own UI (e.g. a wizard) and an extra "✅ Opened…"
 * line would just be noise. */
export type CustomActionHandler = (ctx: CustomActionContext) => Promise<{ message: string }>

/** Map `<plugin>.<actionId>` → handler. */
export const CUSTOM_ACTIONS: Record<string, CustomActionHandler> = {
  'verify.postButton': async ({ interaction, guildId }) => {
    const cfg = await getPluginConfig(guildId, 'verify')
    const meta = cfg?.metadata
    const targetChannelId = meta?.channelId

    let target: TextChannel
    if (targetChannelId) {
      const ch = await interaction.guild?.channels.fetch(targetChannelId).catch(() => null)
      if (!ch || !ch.isTextBased() || !('send' in ch)) {
        throw new Error('Configured captcha channel is missing or not a text channel. Update it in the panel.')
      }
      target = ch as TextChannel
    } else {
      const current = interaction.channel
      if (!current || !('send' in current)) {
        throw new Error('No captcha channel configured and the current channel is not postable.')
      }
      target = current as TextChannel
    }

    const guildName = interaction.guild?.name ?? 'this server'
    const roleMention = meta?.role ? `<@&${meta.role}>` : '_verified role_'

    const container = new ContainerBuilder()
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🛡️  Verify to enter **${guildName}**\n` +
          `We use a quick captcha to keep ${guildName} bot-free. Takes about 5 seconds.`,
      ),
    )
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**How it works**\n` +
          `1. Tap **Verify** below\n` +
          `2. Match the emoji to its emotion\n` +
          `3. You’ll receive the ${roleMention} role and full access`,
      ),
    )
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('open_verify_modal')
          .setLabel('Verify')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
      ),
    )

    await target.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    })

    return { message: `Posted captcha message to <#${target.id}>.` }
  },

  'quests.create': async ({ interaction, guildId }) => {
    await openCreateWizard(interaction, guildId)
    return { message: '' }
  },

  'quests.list': async ({ interaction, guildId }) => {
    await openQuestList(interaction, guildId)
    return { message: '' }
  },
}

export const runCustomAction = async (
  plugin: PluginName,
  actionId: string,
  ctx: CustomActionContext,
): Promise<void> => {
  const handler = CUSTOM_ACTIONS[`${plugin}.${actionId}`]
  if (!handler) {
    await ctx.interaction.followUp({
      content: `❌ Unknown custom action: ${plugin}.${actionId}`,
      flags: MessageFlags.Ephemeral,
    })
    return
  }
  try {
    const { message } = await handler(ctx)
    if (message) {
      await ctx.interaction.followUp({ content: `✅ ${message}`, flags: MessageFlags.Ephemeral })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await ctx.interaction.followUp({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral })
  }
}
