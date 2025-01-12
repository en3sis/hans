import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  InteractionType,
  ModalBuilder,
  ModalSubmitInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { Hans } from '../..'
import { deleteFromCache, getFromCache, setToCache } from '../../libs/node-cache'
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
  try {
    const emojiMap = [
      { emoji: '😊', name: 'happy' },
      { emoji: '😢', name: 'sad' },
      { emoji: '😡', name: 'angry' },
    ]

    if (interaction.isButton()) {
      if (interaction.customId !== 'open_verify_modal') return

      const userCaptchaChallenge = emojiMap[Math.floor(Math.random() * emojiMap.length)]
      if (!userCaptchaChallenge) {
        await interaction.reply({
          content: 'An error occurred while generating the captcha. Please try again.',
          ephemeral: true,
        })
        return
      }

      deleteFromCache(`userCaptchaChallenge#${interaction.user.id}`)
      setToCache(`userCaptchaChallenge#${interaction.user.id}`, userCaptchaChallenge, 1)

      // Define a modal
      const modal = new ModalBuilder()
        .setCustomId('verify_modal')
        .setTitle('Captcha verification')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('input1')
              .setLabel(`Which emotion does this emoji ${userCaptchaChallenge.emoji} represent?`)
              .setPlaceholder(
                `Type the name of the emotion, ex: ${emojiMap.map((e) => e.name).join(', ')}`,
              )
              .setStyle(TextInputStyle.Short),
          ),
        )

      // Show the modal to the user
      await interaction.showModal(modal)
    }
  } catch (error) {
    console.error(error)
    throw new Error('Failed to show the modal.')
  }
}

export const verifyModalSubmit = async (interaction: ModalSubmitInteraction) => {
  try {
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId !== 'verify_modal') return

      await interaction.deferReply({ ephemeral: true })

      const input = interaction.fields.getTextInputValue('input1').toLocaleLowerCase()
      const userCaptchaChallenge = getFromCache(`userCaptchaChallenge#${interaction.user.id}`) as {
        emoji: string
        name: string
      }

      if (input !== userCaptchaChallenge?.name) {
        await interaction.followUp({
          content: `❌ Failed to verify that you are human. Please try again.`,
          ephemeral: true,
        })
      } else {
        const member = interaction.member

        if (member instanceof GuildMember) {
          const guildPluginSettings = await Hans.guildPluginSettings(interaction.guildId, 'verify')
          const guildRole = interaction.guild?.roles.cache.get(guildPluginSettings.metadata.role)

          if (guildRole) {
            await member.roles
              .add(guildRole)
              .then(() =>
                interaction.followUp({ content: '✅ You are now verified.', ephemeral: true }),
              )
              .catch(() => {
                interaction.followUp({ content: 'Failed to add the role.', ephemeral: true })
              })
          } else {
            interaction.followUp({ content: 'Role not found.', ephemeral: true })
          }
        } else {
          interaction.followUp({ content: 'Could not resolve member details.', ephemeral: true })
        }
      }
    }
  } catch (error) {
    console.error(error)
    await interaction.followUp({ content: 'Failed to verify the user.', ephemeral: true })
  }
}
