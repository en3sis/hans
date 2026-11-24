import { Client, Guild } from 'discord.js'
import { removeOneGuild } from '../controllers/bot/guilds.controller'

export default {
  name: 'guildRemove',
  once: false,
  enabled: true,
  async execute(Hans: Client, guild: Guild) {
    try {
      // When he joins a guild, insert it into the database
      await removeOneGuild(guild)
    } catch (error) {
      console.log('❌ guildRemove() : ', error)
    }
  },
}
