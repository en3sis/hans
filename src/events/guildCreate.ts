import { Client, Guild } from 'discord.js'
import { insetOneGuild } from '../controllers/bot/guilds.controller'
import { log } from '../utils/log'

export default {
  name: 'guildCreate',
  once: false,
  enabled: true,
  async execute(Hans: Client, guild: Guild) {
    try {
      // When he joins a guild, insert it into the database
      await insetOneGuild(guild)
    } catch (error) {
      log.info('❌ guildCreate() : ', error)
    }
  },
}
