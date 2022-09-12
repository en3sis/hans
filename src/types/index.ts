import { ActivityType } from 'discord.js'

export interface IBot extends BotConfigI {
  name: string
  website: string
  guildId: string
  permaInvite: string
}

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
