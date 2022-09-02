import { Client, TextChannel } from 'discord.js'
import { githubAPI } from '../../lib/axios'
import { getFromCache } from '../../lib/node-cache'
import { BotI } from '../../types'
// Create a function that notify when the Discord.js Bot is online, send a message to a given channel
export const notifyPulse = async (Hans: Client) => {
  if (process.env.ISDEV!) return

  const used = process.memoryUsage().heapUsed / 1024 / 1024

  const lastCommit = await githubAPI('repos/en3sis/hans/commits')
  const config: BotI = getFromCache('config')

  if (!config.botStartAlertChannel) return

  const channel = Hans.channels.cache.get(config.botStartAlertChannel) as TextChannel

  const author = process.env.GITHUB_API_TOKEN
    ? {
        name: `${lastCommit[0].commit.author.name}`,
        url: `${lastCommit[0].commit.url}`,
        iconURL: `${lastCommit[0].author.avatar_url}`,
      }
    : {
        name: ``,
      }

  // Send a text to the channel notifying that the bot is online
  await channel.send({
    embeds: [
      {
        author: author,
        description: `
          💬 Last commit message:
          ${lastCommit[0].commit.message}`,
        fields: [
          {
            name: '🖥 Memory usage',
            value: `${Math.round(used * 100) / 100} MB`,
            inline: true,
          },
          {
            name: '✅ Online',
            value: `${Hans.user.username} is now online!`,
            inline: true,
          },
        ],
        timestamp: new Date(),
        color: 0x00ff00,
      },
    ],
  })
}
