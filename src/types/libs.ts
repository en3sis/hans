import { Collection } from 'discord.js';
import { MongoClient } from 'mongodb';

declare module 'discord.js' {
  export interface Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commands: Collection<unknown, any>
    mongo: MongoClient
  }
}
