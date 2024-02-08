import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  InteractionType,
  ModalBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { Hans } from '../..'
import { getFromCache, setToCache } from '../../libs/node-cache'
import { updateMetadataGuildPlugin } from '../bot/plugins.controller'

export const verifyGuildPluginSettings = async (interaction: ChatInputCommandInteraction) => {
  const role = interaction.options.get('role')?.value as string

  const guildRole = interaction.guild.roles.cache.get(role)

  await updateMetadataGuildPlugin({ role }, 'verify', interaction.guildId)

  const button = new ButtonBuilder()
    .setCustomId('open_verify_modal')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary)

  // Send the button to a channel
  await (interaction.channel as TextChannel).send({
    content: `
    ## 🤖 Captcha Verification
Please click the button below to verify that you are human.
    `,
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
  })

  await interaction.editReply({
    content: `Verify plugin settings updated. All verified users will receive the ${guildRole} role.`,
  })
}

export const verifyModal = async (interaction: Interaction) => {
  const emojiMap = [
    { emoji: '😊', name: 'happy' },
    { emoji: '😢', name: 'sad' },
    { emoji: '😡', name: 'angry' },
  ]

  if (interaction.isButton()) {
    if (interaction.customId !== 'open_verify_modal') return

    const randomEmoji = emojiMap[Math.floor(Math.random() * emojiMap.length)]
    setToCache('randomEmoji', randomEmoji)

    // Define a modal
    const modal = new ModalBuilder()
      .setCustomId('verify_modal')
      .setTitle('Captcha verification')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('input1')
            .setLabel(`Which emotion does this emoji ${randomEmoji.emoji} represent?`)
            .setPlaceholder('Type the name of the emotion.')
            .setStyle(TextInputStyle.Short),
        ),
      )

    // Show the modal to the user
    await interaction.showModal(modal)
  }
}

export const verifyModalSubmit = async (interaction: Interaction) => {
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId !== 'verify_modal') return
    const input = interaction.fields.getTextInputValue('input1').toLocaleLowerCase()
    const randomEmoji = getFromCache('randomEmoji') as { emoji: string; name: string }

    if (input !== randomEmoji.name) {
      await interaction.reply({
        content: `❌ Failed to verify that you are human. Please try again.`,
        ephemeral: true,
      })
    } else {
      const member = interaction.member

      // Ensure the member is indeed a GuildMember object to access the GuildMemberRoleManager
      if (member instanceof GuildMember) {
        const guildPluginSettings = await Hans.guildPluginSettings(interaction.guildId, 'verify')

        const guildRole = interaction.guild.roles.cache.get(guildPluginSettings.metadata.role)

        if (guildRole) {
          await member.roles
            .add(guildRole)
            .then(() => interaction.reply({ content: '✅ You are now verified.', ephemeral: true }))
            .catch((error) => {
              // Handle errors, like missing permissions
              console.error(error)
              interaction.reply({ content: 'Failed to add the role.', ephemeral: true })
            })
        } else {
          // Role not found
          interaction.reply({ content: 'Role not found.', ephemeral: true })
        }
      } else {
        // Member is not a GuildMember object
        interaction.reply({ content: 'Could not resolve member details.', ephemeral: true })
      }
    }
  }
}
