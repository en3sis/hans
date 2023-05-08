import { Message, NewsChannel, StartThreadOptions, TextChannel, ThreadChannel } from 'discord.js'
import { DEFAULT_COLOR } from '../../utils/colors'
import { isStaff } from '../../utils/permissions'
import { GuildPluginData, PluginsThreadsMetadata } from '../bot/plugins.controller'

// TODO: Requires refactor, fix the usage of any
export const threadAutoCreate = async (
  message: Message,
  config: GuildPluginData & { metadata: PluginsThreadsMetadata },
) => {
  try {
    if (!config.metadata) return
    if (message.hasThread) return

    const { title, autoMessage, channelId, enabled } = config?.metadata.find(
      (m: PluginsThreadsMetadata) => m.channelId === message.channelId,
    )

    if (channelId !== message.channelId || !enabled) return

    const authorUser = message.author
    const authorMember = message.member
    const channel = message.channel

    if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) return
    // If the message is already in a thread, skip

    const authorName =
      authorMember === null || authorMember.nickname === null
        ? authorUser.username
        : authorMember.nickname

    const settings: StartThreadOptions = {
      name: `${title || 'New thread'} | ${authorName}`,
      autoArchiveDuration: 1440,
      rateLimitPerUser: 0,
      reason: `${title || 'New thread'} | ${authorName}`,
    }

    const thread = await message.startThread(settings)

    // Send a message to the thread after 3 seconds if configured to do so.
    setTimeout(async () => {
      if (!autoMessage) return
      await thread.send({
        embeds: [
          {
            title: 'Thread Auto Message',
            description: autoMessage,
            color: DEFAULT_COLOR,
          },
        ],
      })
    }, 3000)
  } catch (error) {
    console.log('ERROR: threadAutoCreate(): ', error)
  }
}

/** // TODO: Requires refactor
 * Check if the message author is the owner of the thread or a staff member, if not, removes the message
 * @param message Message
 */
export const disallowCommentsInPublicThreads = async (message: Message) => {
  try {
    // if (!(message.channel instanceof ThreadChannel)) return
    const threadChannel = message.channel as ThreadChannel

    if (isStaff(message) || threadChannel.ownerId === message.author.id) return

    await message.delete()
    await message.channel
      .send('🪬 Only Owner & Staff can comment in public threads in this channel.')
      .then((msg: Message) => setTimeout(() => msg.delete(), 5000))
  } catch (error) {
    console.log('ERROR: disallowCommentsInPublicThreads: ', error)
  }
}
