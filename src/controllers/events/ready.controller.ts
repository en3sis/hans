import { Client, TextChannel } from 'discord.js'
import { githubAPI } from '../../libs/axios'

export const notifyPulse = async (Hans: Client) => {
  // INFO Disables pulse notification in development
  if (process.env.ISDEV!) return

  try {
    const used = process.memoryUsage().heapUsed / 1024 / 1024

    const lastCommit = await githubAPI('repos/en3sis/hans/commits')
    const config = Hans.settings

    if (!config.notify_channel_id) return

    const channel = Hans.channels.cache.get(config.notify_channel_id) as TextChannel

    const author = {
      name: `${lastCommit[0].commit.author.name}`,
      url: `${lastCommit[0].html_url}`,
      iconURL: `${lastCommit[0].author.avatar_url}`,
    }

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
