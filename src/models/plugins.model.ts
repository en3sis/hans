import { Database } from '../types/database.types'

export type Plugins = Database['public']['Tables']['plugins']['Row']
export type GuildPlugins = Database['public']['Tables']['guilds-plugins']['Row']

export type GenericPluginParts = Omit<Plugins, 'id' | 'name'>
const genericStructure: GenericPluginParts = {
  created_at: new Date().toISOString(),
  premium: false,
  enabled: true,
  category: 'miscellaneous',
  description: '',
}

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

  threads: {
    ...genericStructure,
    description: 'Allows for the automatic creation of threads in a specific channel.',
    category: 'server',
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
