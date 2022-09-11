import { Client, Message } from 'discord.js'
import { findOneGuild, insetOneGuild } from '../mongodb/mongo-guilds.controller'
import { removeLinks, sentimentAnalysisFn } from './moderation.controller'
import { threadAutoCreate } from './threads.controller'

export const pluginsController = async (Hans: Client, message: Message) => {
  try {
    const document = await findOneGuild(message.guildId)

    // PLUGINS: Moderation
    if ('status' in document) {
      const guild = Hans.guilds.cache.get(message.guildId)
      await insetOneGuild(guild)
    } else {
      const { moderation, threadChannels } = document.plugins
      // PLUGINS: Moderation
      if (moderation) {
        const { sentimentAnalysis, links } = moderation

        // sentimentAnalysis plugin
        if (sentimentAnalysis.enabled && sentimentAnalysis.logChannelId) {
          if (sentimentAnalysis.watchAllChannels) {
            await sentimentAnalysisFn(
              message,
              sentimentAnalysis.logChannelId,
              sentimentAnalysis.reactToPositive
            )
          } else if (sentimentAnalysis.watchSpecificChannels.includes(message.channelId)) {
            await sentimentAnalysisFn(
              message,
              sentimentAnalysis.logChannelId,
              sentimentAnalysis.reactToPositive
            )
          }
        }

        if (links.enabled) {
          await removeLinks(message, links.allowedLinks, links.allowedRoles)
        }
      }

      // PLUGINS: Threads
      if (threadChannels.length) {
        const channelHasThreads = threadChannels.filter((ele) => ele.enabled)
        Promise.all(channelHasThreads.map(async (channel) => {
          if ('enabled' in channel && channel.threadChannelId === message.channelId) {
            await threadAutoCreate(message, channel)
          }
        }))
      }
    }
  } catch (error) {
    console.error('❌ ERROR: pluginsController()', error)
  }
}
