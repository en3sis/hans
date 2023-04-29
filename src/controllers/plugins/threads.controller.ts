import { Message, NewsChannel, StartThreadOptions, TextChannel, ThreadChannel } from 'discord.js'
import { IThreadChannels } from '../../models/guild.model'
import { isStaff } from '../../utils/permissions'

export const threadAutoCreate = async (message: Message, config: IThreadChannels) => {
  try {
    if (!config.threadChannelId) return

    const authorUser = message.author
    const authorMember = message.member
    const channel = message.channel

    if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) return
    if (message.hasThread) return

    const authorName =
      authorMember === null || authorMember.nickname === null
        ? authorUser.username
        : authorMember.nickname

    const settings: StartThreadOptions = {
      name: `${config?.threadTitle || 'New thread'} | ${authorName}`,
      autoArchiveDuration: 1440,
      rateLimitPerUser: 0,
      reason: `${config?.threadTitle || 'New thread'} | ${authorName}`,
    }

    const thread = await message.startThread(settings)

    setTimeout(async () => {
      if (!config.botMessageInThread) return
      await thread.send({
        content: config.botMessageInThread,
      })
    }, 3000)
  } catch (error) {
    console.log('ERROR: threadAutoCreate(): ', error)
  }
}

/**
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

// Exports a function that will add a new thread to the database in guilds db, threadChannels document
export const addThread = async (
  guildId: string,
  channelId: string,
  customTitle: string,
  botResponse: string,
) => {
  try {
    // TODO: Fix this
    // await updateOne({
    //   dataBase: 'guilds',
    //   collection: 'global',
    //   query: { _id: guildId },
    //   data: {
    //     $push: {
    //       'plugins.threadChannels': {
    //         threadTitle: customTitle,
    //         botMessageInThread: botResponse,
    //         threadChannelId: channelId,
    //       },
    //     },
    //   },
    // })
  } catch (error) {
    console.log('ERROR: addThread(): ', error)
  }
}

// Removes the sub-document from plugins, threadChannels array
export const removeThread = async (guildId: string, channelId: string) => {
  try {
    // TODO: Fix this
    // const response = await updateOne({
    //   dataBase: 'guilds',
    //   collection: 'global',
    //   query: { _id: guildId },
    //   data: {
    //     $pull: {
    //       'plugins.threadChannels': {
    //         threadChannelId: channelId,
    //       },
    //     },
    //   },
    // })
    // return response
  } catch (error) {
    console.log('ERROR: removeThread(): ', error)
  }
}
