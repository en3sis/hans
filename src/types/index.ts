import { ActivityType } from 'discord.js'
import { Database } from './database.types'

export interface IBot extends BotConfigI {
  name: string
  discordId: string
  website: string
  guildId: string
  permaInvite: string
}

export type BotSettingsT = Database['public']['Tables']['config']['Row']

export interface BotConfigI {
  disabledCommands: string[]
  commandsDevGuild: {
    folderName: string
  }
  botStartAlertChannel: string
  activities: {
    type: Exclude<ActivityType, ActivityType.Custom>
    name: 'you'
  }
}
