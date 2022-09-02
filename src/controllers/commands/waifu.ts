import axios from 'axios'
import { Message } from 'discord.js'

export const getRandomWaifu = async (msg: Message, nsfw = false): Promise<Message> => {
  const { data } = await axios.get(`https://api.waifu.im/random?is_nsfw=${nsfw}`)

  return msg.channel.send({
    embeds: [
      {
        title: '👸🏻 Waifu',
        description: `💖 Your Waifu is here to take care of you! 💖`,
        image: { url: data.images[0].url },
      },
    ],
  })
}
