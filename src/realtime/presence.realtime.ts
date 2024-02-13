import { setPresence } from '../controllers/bot/config.controller'
import { deleteFromCache } from '../libs/node-cache'
import supabase from '../libs/supabase'

export const configsRealtime = () => {
  // Listen for changes in the configs table
  supabase
    .channel('table-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'configs',
      },
      async (payload) => {
        await setPresence(payload.new.activity_type, payload.new.activity_name)
      },
    )
    .subscribe()

  // Listen for changes in the guilds plugins table and delete the cached data
  supabase
    .channel('table-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'guilds_plugins',
      },
      async (payload) => {
        deleteFromCache(`guildPlugins:${payload.new.owner}:${payload.new.name}`)
      },
    )
    .subscribe()
}
