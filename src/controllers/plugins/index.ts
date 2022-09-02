import { Message } from 'discord.js'
import { ThreadChannelConfigI } from '../../models/guild.model'
import { findOneGuild } from '../mongodb/guilds.controller'
import { removeLinks, sentimentAnalysisFn } from './moderation.controller'
import { threadAutoCreate } from './threads.controller'

export const pluginsController = async (message: Message) => {
  const { plugins } = await findOneGuild(message.guildId)

  // PLUGINS: Moderation
  if (plugins.moderation) {
    const {
      moderation: { sentimentAnalysis, links },
    } = plugins

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
  if (plugins.threadChannels) {
    const channelHasThreads = plugins.threadChannels.filter(
      (ele: ThreadChannelConfigI) => ele.enabled
    )[0]
    if (channelHasThreads && channelHasThreads.threadChannelId === message.channelId) {
      await threadAutoCreate(message, channelHasThreads)
    }
  }
}
