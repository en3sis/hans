import { BotConfig } from '@/controllers/bot/config'
import { ActivityType } from 'discord.js'

export type Hans = BotConfig

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
