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
    description: 'Notifies when a new member joins/leaves the server.',
    category: 'server',
  },
  // guildMemberRemove: {
  //   description: 'Notifies when a member leaves the server.',
  //   ...genericStructure,
  // },
  messageDelete: {
    ...genericStructure,
    description: 'Notifies when a message is deleted in a channel.',
    category: 'moderation',
  },
  messageUpdate: {
    ...genericStructure,
    description: 'Notifies when a message is updated in a channel.',
    category: 'moderation',
  },
  messageReactionAdd: {
    ...genericStructure,
    description: 'Notifies when a reaction is added to a message.',
    category: 'engagement',
  },
  messageReactionRemove: {
    ...genericStructure,
    description: 'Notifies when a reaction is removed from a message.',
    category: 'engagement',
  },
  chatGtp: {
    ...genericStructure,
    description: 'Enables a conversation with ChatGPT, an AI chatbot.',
    premium: true,
    category: 'productivity',
  },
  removeLinks: {
    ...genericStructure,
    description:
      'Removes any links posted in a channel, with the option to allow specific roles or links to be posted.',
    category: 'moderation',
  },
  threads: {
    ...genericStructure,
    description: 'Allows for the automatic creation of threads in a specific channel.',
    category: 'server',
  },
}
