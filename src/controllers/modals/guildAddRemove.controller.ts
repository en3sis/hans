import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

// TODO: change the configurations to modals

export const guildAddRemoveModalPluginConfiguration = async (interaction) => {
  const modal = new ModalBuilder()
    .setCustomId('Plugin: Guild Activity')
    .setTitle('Members join/leave notifications')

  // Add components to modal

  // Create the text input components
  const chatGPTKey = new TextInputBuilder()
    .setCustomId('channelId')
    // The label is the prompt the user sees for this input
    .setLabel('Channel ID')
    .setPlaceholder('Insert the channel ID where the messages will be sent')
    // Short means only a single line of text
    .setStyle(TextInputStyle.Short)

  // const hobbiesInput = new TextInputBuilder()
  //   .setCustomId('hobbiesInput')
  //   .setLabel("What's some of your favorite hobbies?")
  //   // Paragraph means multiple lines of text.
  //   .setStyle(TextInputStyle.Paragraph)

  // An action row only holds one text input,
  // so you need one action row per text input.
  const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
    chatGPTKey,
  )
  // const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput)

  // Add inputs to the modal
  modal.addComponents(firstActionRow)

  // Show the modal to the user
  await interaction.showModal(modal)

  // Catch the modal submision

  if (interaction.isModalSubmit()) {
    const description = interaction.fields.getTextInputValue('channelId')
    console.log(
      '🚀 ~ file: guildAddRemove.controller.ts:48 ~ guildAddRemoveModalPluginConfiguration ~ description:',
      description,
    )

    interaction.reply({
      content: 'Modal submitted!' + description,
      ephemeral: true,
    })
  }
}
