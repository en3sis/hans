import { Client, Interaction } from 'discord.js'
import { reportErrorToMonitoring } from '../utils/monitoring'

module.exports = {
  name: 'interactionCreate',
  once: false,
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(Hans: Client, interaction: Interaction) {
    if (!interaction.isCommand()) return

    const command = Hans.commands.get(interaction.commandName)

    if (process.env.ISDEV) {
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
        title: `Command: ${command.data.name}`,
        description: `${error.message}`,
      }

      await reportErrorToMonitoring({ embeds: _embed })

      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      })
    }
  },
}
