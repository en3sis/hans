import { Client, Interaction, InteractionType } from 'discord.js'
import { verifyModal, verifyModalSubmit } from '../controllers/plugins/verify.controller'
import { db } from '../db/client'
import { commandUsage } from '../db/schema'
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

    await interaction.deferReply({
      ephemeral: command?.ephemeral ?? false,
    })

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
