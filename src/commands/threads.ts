import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { addThread, removeThread } from '../controllers/plugins/threads.controller'
import { HAS_CACHE_MESSAGE } from '../utils/constants'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('threads')
    .setDescription('Automatically creates threads in given channels')
    .setDefaultMemberPermissions('0')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new thread channel')
        .addChannelOption((string) =>
          string.setName('channel').setDescription('channel').setRequired(true),
        )
        .addStringOption((string) => string.setName('title').setDescription('Thread custom title'))
        .addStringOption((string) =>
          string
            .setName('response')
            .setDescription('Bot response message inside the thread (if instructions needed)'),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Removes configuration for a thread channel')
        .addChannelOption((string) =>
          string
            .setName('channel')
            .setDescription('Channel to disable thread functionality')
            .setRequired(true),
        ),
    ),
  async execute(interaction: CommandInteraction) {
    try {
      if (!interaction.memberPermissions.has(['Administrator']))
        interaction.reply({
          content: 'You do not have permission to use this command',
          ephemeral: true,
        })
      if (!interaction.isChatInputCommand()) return

      const channel = interaction.options.get('channel')!.value as string

      if (interaction.options.getSubcommand() === 'add') {
        const title = (interaction.options.get('title')?.value as string) || ''
        const response = (interaction.options.get('response')?.value as string) || ''

        await addThread(interaction.guildId, channel, title, response)

        return interaction.reply({
          content: `✅ Threads enabled for ${
            interaction.guild.channels.cache.get(channel).name
          }. ${HAS_CACHE_MESSAGE}`,
          ephemeral: true,
        })
      } else if (interaction.options.getSubcommand() === 'remove') {
        const res = await removeThread(interaction.guildId, channel)
        //TODO: Fix this
        if (true) {
          return interaction.reply({
            content: `🗑 Threads disabled for ${
              interaction.guild.channels.cache.get(channel).name
            }. ${HAS_CACHE_MESSAGE}`,
            ephemeral: true,
          })
        }

        return interaction.reply({
          content: `❌  Threads are not enabled for ${
            interaction.guild.channels.cache.get(channel).name
          }`,
          ephemeral: true,
        })
      }
    } catch (error) {
      console.log('❌ ERROR: reddit(): ', error)
    }
  },
}
