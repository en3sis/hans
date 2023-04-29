import { Database } from '../types/database.types'

export type Plugins = Database['public']['Tables']['plugins']['Row']
export type GuildPlugins = Database['public']['Tables']['guilds-plugins']['Row']

const genericStructure: Omit<Plugins, 'id' | 'name' | 'description'> = {
  created_at: new Date().toISOString(),
  premium: false,
  enabled: true,
}

export const pluginsList = {
  guildCreate: { description: 'Notifies when a guild is created ', ...genericStructure },
  guildDelete: { description: '', ...genericStructure },
  guildMemberAdd: { description: '', ...genericStructure },
  guildMemberRemove: { description: '', ...genericStructure },
  messageDelete: { description: '', ...genericStructure },
  messageUpdate: { description: '', ...genericStructure },
  messageCreate: { description: '', ...genericStructure },
  messageReactionAdd: { description: '', ...genericStructure },
  messageReactionRemove: { description: '', ...genericStructure },
  chatGtp: { description: '', ...genericStructure, premium: true },
  moderation: { description: '', ...genericStructure },
  threads: { description: '', ...genericStructure },
}

// export const guildPluginsStructure: Omit<GuildPlugins, 'id'> = {
//   created_at: new Date().toISOString(),
//   enabled: false,

// }
