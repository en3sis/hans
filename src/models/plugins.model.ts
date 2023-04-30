import { Database } from '../types/database.types'

export type Plugins = Database['public']['Tables']['plugins']['Row']
export type GuildPlugins = Database['public']['Tables']['guilds-plugins']['Row']

const genericStructure: Omit<Plugins, 'id' | 'name' | 'description'> = {
  created_at: new Date().toISOString(),
  premium: false,
  enabled: true,
}

export const pluginsList = {
  guildMemberAdd: {
    description: 'Notifies when a new member joins the server.',
    ...genericStructure,
  },
  guildMemberRemove: {
    description: 'Notifies when a member leaves the server.',
    ...genericStructure,
  },
  messageDelete: {
    description: 'Notifies when a message is deleted in a channel.',
    ...genericStructure,
  },
  messageUpdate: {
    description: 'Notifies when a message is updated in a channel.',
    ...genericStructure,
  },
  messageReactionAdd: {
    description: 'Notifies when a reaction is added to a message.',
    ...genericStructure,
  },
  messageReactionRemove: {
    description: 'Notifies when a reaction is removed from a message.',
    ...genericStructure,
  },
  chatGtp: {
    description: 'Enables a conversation with ChatGPT, an AI chatbot.',
    ...genericStructure,
    premium: true,
  },
  removeLinks: {
    description:
      'Removes any links posted in a channel, with the option to allow specific roles or links to be posted.',
    ...genericStructure,
  },
  threads: {
    description: 'Allows for the automatic creation of threads in a specific channel.',
    ...genericStructure,
  },
}
