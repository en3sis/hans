export interface IBot extends BotConfigI {
  name: string
  website: string
  guildId: string
  permaInvite: string
}

export interface BotConfigI {
  commandsDevGuild: {
    folderName: string
  }
  botStartAlertChannel: string
  activities: {
    type: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING'
    name: 'you'
  }
}
