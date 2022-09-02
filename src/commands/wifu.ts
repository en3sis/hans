import { SlashCommandBuilder } from '@discordjs/builders'
import axios from 'axios'
import { CommandInteraction } from 'discord.js'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('wifu')
    .setDescription('Gets you the perfect, beautiful, and random waifu!'),
  async execute(interaction: CommandInteraction) {
    // TODO: if in a NSFW channel, use NSFW tag.
    const { data } = await axios.get(`https://api.waifu.im/random?is_nsfw=false`)

    await interaction.reply({
      embeds: [
        {
          title: '👸🏻 Waifu',
          description: `💖 Your Waifu is here to take care of you! 💖`,
          image: { url: data.images[0].url },
        },
      ],
    })
  },
}
