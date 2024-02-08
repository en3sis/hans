import { Client, Interaction, InteractionType } from 'discord.js'
import { verifyModal, verifyModalSubmit } from '../controllers/plugins/verify.controller'
import { ERROR_COLOR } from '../utils/colors'
import { reportErrorToMonitoring } from '../utils/monitoring'

module.exports = {
  name: 'interactionCreate',
  once: false,
  enabled: true,
  async execute(Hans: Client, interaction: Interaction) {
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

    if (!command) return

    try {
      await command.execute(interaction)
    } catch (error) {
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
    }
  },
}
