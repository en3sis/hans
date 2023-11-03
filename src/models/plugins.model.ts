import { Database } from '../types/database.types'

export type Plugins = Database['public']['Tables']['plugins']['Row']
export type GuildPlugins = Database['public']['Tables']['guilds_plugins']['Row']
export type GenericPluginParts = Omit<Plugins, 'id' | 'name'>

const genericStructure: GenericPluginParts = {
  created_at: new Date().toISOString(),
  premium: false,
  enabled: true,
  category: 'miscellaneous',
  description: '',
}

/** Defines the list of plugins available for the bot */
export const pluginsList: Record<string, GenericPluginParts> = {
  serverMembersActivity: {
    ...genericStructure,
    description: 'Notifies to a specific channel when a new member joins/leaves the server.',
    category: 'server',
  },
  serverMessagesLogs: {
    ...genericStructure,
    description: 'Logs messages those are deleted or edited into a specific channel.',
    category: 'moderation',
  },
  removeLinks: {
    ...genericStructure,
    description:
      'Removes any links posted in a channel, with the option to allow specific roles or links to be posted.',
    category: 'moderation',
    enabled: false,
  },
  chatGtp: {
    ...genericStructure,
    description: 'Enables a conversation with ChatGPT, an AI chatbot.',
    premium: true,
    category: 'productivity',
  },
  summarize: {
    ...genericStructure,
    description: 'Summarizes a text or discord message using the facebook/bart-large-cnn model.',
    premium: false,
    category: 'productivity',
  },
  twitch: {
    ...genericStructure,
    description: 'Shows information about a twitch streamer.',
    premium: false,
    category: 'entertainment',
  },
  textClassification: {
    ...genericStructure,
    description: 'Classifies a text, informs moderation if the sentiment is negative.',
    premium: false,
    enabled: false,
  },
  threads: {
    ...genericStructure,
    description: 'Allows for the automatic creation of threads in a specific channel.',
    category: 'server',
  },
  events: {
    ...genericStructure,
    description:
      'Provides quick Add to calendar links for Google & Outlook for the events you are subscribed to',
    category: 'productivity',
  },
  // messageReactionAdd: {
  //   ...genericStructure,
  //   description: 'Notifies when a reaction is added to a message.',
  //   category: 'engagement',
  // },
  // messageReactionRemove: {
  //   ...genericStructure,
  //   description: 'Notifies when a reaction is removed from a message.',
  //   category: 'engagement',
  // },
}

/** Defines the initial state of a guild plugin */
export const initialGuildPluginState = () => {
  return {
    serverMembersActivity: {
      default_enabled: false,
    },
    serverMessagesLogs: {
      default_enabled: false,
    },
    removeLinks: {
      default_enabled: false,
    },
    chatGtp: {
      default_enabled: true,
    },
    summarize: {
      default_enabled: false,
    },
    twitch: {
      default_enabled: true,
    },
    textClassification: {
      default_enabled: false,
    },
    threads: {
      default_enabled: true,
    },
    events: {
      default_enabled: true,
    },
  }
}
