import { Client, Interaction } from 'discord.js'

module.exports = {
  name: 'interactionCreate',
  once: false,
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(Hans: Client, interaction: Interaction) {
    if (!interaction.isCommand()) return

    const command = Hans.commands.get(interaction.commandName)

    if (Hans.settings.disable_commands.includes(command.data.name))
      return interaction.reply({
        content: `❌ The command \`${command.data.name}\` is globally disabled.`,
        ephemeral: true,
      })

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
      console.error(error)
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      })
    }
  },
}
