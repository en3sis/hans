import { Client, Interaction } from 'discord.js'

module.exports = {
  name: 'interactionCreate',
  once: false,
  enabled: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(Hans: Client, interaction: Interaction) {
    if (interaction.isSelectMenu()) {
      if (interaction.values[0] === 'correctVerify') {
        const role = Hans.guilds.cache
          .get(interaction.guildId)
          .roles.cache.find((role) => role.name === 'Miner')

        return await Hans.guilds.cache
          .get(interaction.guildId)
          .members.cache.get(interaction.user.id)
          .roles.add(role)
      }
    }

    if (!interaction.isCommand()) return

    const command = Hans.commands.get(interaction.commandName)

    // DEBUG
    if (process.env.ISDEV) {
      console.log('🔍 Command Details: ', command)
      console.log(
        '🤖 Hans registered commands: ',
        Hans.commands.map((ele) => ele.data.name).join(', ')
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
