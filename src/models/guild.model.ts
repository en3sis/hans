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
    moderation: typeof moderation
    guildMembersActivity: typeof guildMembersActivity
    threadChannels: typeof threadChannels[] | []
  }
}


// Plugins Objects
// +=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=+
export const moderation = {
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

export const guildMembersActivity = {
  enabled: false,
  logChannelId: '',
}

export const threadChannels = {
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
