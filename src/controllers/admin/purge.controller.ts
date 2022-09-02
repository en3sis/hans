import { CommandInteraction } from 'discord.js'

export const purgeMessages = async (interaction: CommandInteraction) => {
  try {
    const amount = interaction.options.getNumber('n') as number

    if (amount > 100) {
      return interaction.reply({
        content: 'You can only delete up to 100 messages at once.',
        ephemeral: true,
      })
    }

    const fetched = await interaction.channel.messages.fetch({
      limit: amount,
    })

    interaction.channel.bulkDelete(fetched).catch((err) => {
      console.error(err)
      return interaction.reply({
        content: err,
        ephemeral: true,
      })
    })

    interaction.reply({ content: `Deleted ${amount} messages.`, ephemeral: true })
  } catch (error) {
    interaction.reply(`Couldn't delete messages because of: ${error}`)
  }
}
