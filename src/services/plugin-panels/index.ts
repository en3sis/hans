/**
 * Plugin Panels — declarative settings UI for every plugin.
 *
 * Public surface:
 *   openPanel(interaction)           Open the /plugins panel for an admin.
 *   routePanelInteraction(interaction) Dispatch a component/modal event.
 *   isPanelCustomId(id)              Cheap check before routing.
 */
import { ChatInputCommandInteraction, Interaction, MessageFlags } from 'discord.js'
import { handlePanelComponent, handlePanelModalSubmit } from './handlers'
import { renderListView } from './render'
import { isPanelCustomId, parseCustomId } from './router'

export { isPanelCustomId } from './router'

/** Slash entry-point: open the list view as an ephemeral panel. */
export const openPanel = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  // The /plugins slash command opts out of the auto-defer in
  // interactionCreate.ts so we can set IS_COMPONENTS_V2 on the initial
  // response. If anything else has already replied (shouldn't happen),
  // fall back to a follow-up.
  const reply = async (payload: { content?: string; flags: number; components?: unknown[] }) => {
    if (interaction.replied || interaction.deferred) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await interaction.followUp(payload as any)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await interaction.reply(payload as any)
    }
  }

  if (!interaction.guildId) {
    return reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral })
  }
  if (!interaction.memberPermissions?.has(['Administrator'])) {
    return reply({
      content: 'You do not have permission to manage plugins.',
      flags: MessageFlags.Ephemeral,
    })
  }

  const payload = await renderListView(interaction.guildId)
  await reply({ flags: payload.flags, components: payload.components })
}

/**
 * Route any incoming interaction that targets the panel system. Returns
 * `true` when handled; the caller should stop further processing.
 */
export const routePanelInteraction = async (interaction: Interaction): Promise<boolean> => {
  if (interaction.isButton() || interaction.isAnySelectMenu()) {
    if (!isPanelCustomId(interaction.customId)) return false
    const parsed = parseCustomId(interaction.customId)
    if (!parsed) return false
    try {
      await handlePanelComponent(interaction, parsed)
    } catch (err) {
      console.error('❌ Panel component handler error:', err)
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: '❌ Something went wrong. Try `/plugins` again.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {})
      }
    }
    return true
  }

  if (interaction.isModalSubmit()) {
    if (!isPanelCustomId(interaction.customId)) return false
    const parsed = parseCustomId(interaction.customId)
    if (!parsed) return false
    try {
      await interaction.deferUpdate().catch(() => {})
      await handlePanelModalSubmit(interaction, parsed)
    } catch (err) {
      console.error('❌ Panel modal handler error:', err)
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: '❌ Failed to save. Try `/plugins` again.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {})
      }
    }
    return true
  }

  return false
}
