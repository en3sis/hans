import { Client, TextChannel } from 'discord.js'
import { githubAPI } from '../../lib/axios'
import { getFromCache } from '../../lib/node-cache'
import { Hans } from '../../types'

// Creates a function that queries mongodb for the bot configuration, if founded, adds it to the cache

// Create a function that notify when the Discord.js Bot is online, send a message to a given channel
export const notifyPulse = async (Hans: Client) => {
  // Disables pulse notification in development
  if (process.env.ISDEV!) return

  try {
    const used = process.memoryUsage().heapUsed / 1024 / 1024

    const lastCommit = await githubAPI('repos/en3sis/hans/commits')
    const config: Hans = getFromCache('config')

    if (!config.notify_channel_id) return

    const channel = Hans.channels.cache.get(config.notify_channel_id) as TextChannel

    const author = {
      name: `${lastCommit[0].commit.author.name}`,
      url: `${lastCommit[0].html_url}`,
      iconURL: `${lastCommit[0].author.avatar_url}`,
    }

    // Send a text to the channel notifying that the bot is online
    await channel.send({
      embeds: [
        {
          author: author,
          description: `
          **💬 Last commit message**:
          ${lastCommit[0].commit.message}`,
          title: `✅  ${Hans.user.username} is now online!`,
          fields: [
            {
              name: '🖥 Memory usage',
              value: `${Math.round(used * 100) / 100} MB`,
              inline: true,
            },
            {
              name: '🔰 Node Version',
              value: `${process.env.NODE_VERSION || process.version}`,
              inline: true,
            },
          ],
          timestamp: lastCommit[0].commit.author.date,
          color: 0x00ff00,
        },
      ],
    })
  } catch (error) {
    console.error('❌ ERROR: notifyPulse()', error)
  }
}
