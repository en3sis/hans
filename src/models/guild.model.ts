import { ObjectId } from 'mongodb'

export interface GuildI extends GuildDocI {
  _id: ObjectId
  name: string
  avatar: string
  date: Date
  premium: boolean
}

export interface GuildDocI {
  guildEventsNotifications: {
    guildMemberAdd: boolean
    guildMemberRemove: boolean
    messageDelete: boolean
    messageUpdate: boolean
  }
  plugins: {
    moderation: ModerationPluginI
    guildMembersActivity: GuildMembersActivityPluginI
    threadChannels: ThreadChannelConfigI[] | []
  }
}

export interface ModerationPluginI {
  links: {
    enabled: boolean
    allowedLinks: string[]
    allowedRoles: string[]
  }
  sentimentAnalysis: {
    enabled: boolean
    reactToPositive: boolean
    watchAllChannels: boolean
    watchSpecificChannels: string[]
    logChannelId: string
  }
  messagesAlterations: {
    logChannelId: string
  }
}

export interface GuildMembersActivityPluginI {
  enabled: boolean
  logChannelId: string
}

export interface ThreadChannelConfigI {
  enabled: boolean
  threadTitle: string
  botMessageInThread: string
  threadChannelId: string
}

// Plugins Objects
// +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
export const moderation: ModerationPluginI = {
  links: {
    enabled: false,
    allowedLinks: [],
    allowedRoles: [],
  },
  sentimentAnalysis: {
    enabled: false,
    reactToPositive: false,
    watchAllChannels: false,
    watchSpecificChannels: [],
    logChannelId: '',
  },
  messagesAlterations: {
    logChannelId: '',
  },
}

export const guildMembersActivity: GuildMembersActivityPluginI = {
  enabled: false,
  logChannelId: '',
}

export const threadChannels: ThreadChannelConfigI = {
  enabled: false,
  threadTitle: '',
  botMessageInThread: '',
  threadChannelId: '',
}

// MongoDB Document
export const documentDetails: GuildDocI = {
  guildEventsNotifications: {
    guildMemberAdd: false,
    guildMemberRemove: false,
    messageUpdate: false,
    messageDelete: false,
  },
  plugins: {
    moderation: moderation,
    guildMembersActivity: guildMembersActivity,
    threadChannels: [threadChannels],
  },
}

export default documentDetails
