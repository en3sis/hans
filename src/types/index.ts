export interface BotI extends BotConfigI {
  name: string
  website: string
  guildId: string
}

export interface BotConfigI {
  commandsDevGuild: {
    folderName: string
  }
  botStartAlertChannel: string
}
