import { Client, Interaction, InteractionType } from 'discord.js'
import { verifyModal, verifyModalSubmit } from '../controllers/plugins/verify.controller'
import { db } from '../db/client'
import { commandUsage } from '../db/schema'
import { isPanelCustomId, routePanelInteraction } from '../services/plugin-panels'
import {
  handleQuestInteraction,
  isQuestInteraction,
} from '../services/plugin-panels/quests-flow'
import { ERROR_COLOR } from '../utils/colors'
import { reportErrorToMonitoring } from '../utils/monitoring'

module.exports = {
  name: 'interactionCreate',
  once: false,
  enabled: true,
  async execute(Hans: Client, interaction: Interaction) {
    if (!interaction) {
      throw new Error('Invalid interaction received')
    }

    // Plugin-panel components and modals (buttons + selects + modal submits
    // with our `pn:` custom_id namespace). Returns true if handled.
    if (
      (interaction.isButton() ||
        interaction.isAnySelectMenu() ||
        interaction.isModalSubmit()) &&
      isPanelCustomId(interaction.customId)
    ) {
      const handled = await routePanelInteraction(interaction)
      if (handled) return
    }

    // Quests sub-system (sibling to the panel; `quest:*` custom_ids).
    if (
      (interaction.isButton() ||
        interaction.isAnySelectMenu() ||
        interaction.isModalSubmit()) &&
      isQuestInteraction(interaction.customId)
    ) {
      const handled = await handleQuestInteraction(interaction)
      if (handled) return
    }

    // Handle button interactions
    if (interaction.isButton()) {
      await verifyModal(interaction)
    }

    // Handle modal submit interactions
    if (interaction.type === InteractionType.ModalSubmit) {
      await verifyModalSubmit(interaction)
    }

    if (!interaction.isCommand()) return

    const command = Hans.commands.get(interaction.commandName)

    if (!command) return

    // Commands that send v2-components or showModal() must NOT be deferred —
    // the IS_COMPONENTS_V2 flag cannot be added after deferReply, and showModal
    // requires a fresh, unreplied interaction. Such commands opt out via
    // `defer: false` on their exported module.
    if (command?.defer !== false) {
      await interaction.deferReply({
        ephemeral: command?.ephemeral ?? false,
      })
    }

    if (!!process.env.ISDEV) {
      // Enables the developer to see details in the console.
      console.log('🔍 Command Details: ', command)
      console.log(
        '🤖 Hans registered commands: ',
        Hans.commands.map((ele) => ele.data.name).join(', '),
      )
    }

    const startedAt = Date.now()
    let success = true
    try {
      await command.execute(interaction)
    } catch (error) {
      success = false
      console.error({
        message: `❌ ERROR: interactionCreate(): ${error.message}`,
      })

      const _embed = {
        title: `💢 Command: ${command.data.name}`,
        description: `${error.message}`,
        color: ERROR_COLOR,
      }

      await interaction.editReply({
        embeds: [
          {
            title: `💢 Command: ${command.data.name}`,
            description: `There was an error while trying to execute ${interaction.commandName}. The issue has been reported to the developer team.`,
            color: ERROR_COLOR,
          },
        ],
      })

      await reportErrorToMonitoring({ embeds: _embed })
    } finally {
      const feature_name = interaction.isChatInputCommand()
        ? interaction.options.getSubcommand(false)
        : null
      db.insert(commandUsage)
        .values({
          guild_id: interaction.guildId,
          command_name: interaction.commandName,
          feature_name,
          source: 'slash',
          success,
          duration_ms: Date.now() - startedAt,
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`❌ command_usage log failed: ${msg}`)
        })
    }
  },
}
