import {
  ActionRowBuilder,
  GuildMember,
  Interaction,
  InteractionType,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { Hans } from '../..'
import { deleteFromCache, getFromCache, setToCache } from '../../libs/node-cache'

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
          const guildPluginSettings = await Hans.guildPluginSettings(interaction.guildId!, 'verify')
          const roleId = guildPluginSettings?.metadata?.role
          if (!roleId) {
            await interaction.followUp({
              content:
                'Verify plugin is not configured for this server. Ask an admin to run `/verify enable role:<role>`.',
              ephemeral: true,
            })
            return
          }
          const guildRole = interaction.guild?.roles.cache.get(roleId)

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
