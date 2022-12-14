import { Collection } from 'discord.js'
import { MongoClient } from 'mongodb'
import { IBot } from '.'
import { GuildI } from '../models/guild.model'

declare module 'discord.js' {
  export interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<unknown, any>
    settings: IBot
    mongo: MongoClient
    guildSettings: (guildId: string) => Promise<GuildI | { status: number; message: string }>
  }
}
