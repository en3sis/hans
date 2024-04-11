import { setPresence } from '../controllers/bot/config.controller'
import { registerStandupSchedule } from '../controllers/plugins/standup.controller'
import { stopSpecificCronJob } from '../controllers/tasks/cron-jobs'
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
        console.log('Guild plugin updated:', payload.new)
        // INFO: Refresh the cache for the guild plugins
        deleteFromCache(`guildPlugins:${payload.new.owner}:${payload.new.name}`)

        if (payload.new.name === 'standup') {
          stopSpecificCronJob(`${payload.new.owner}#standup`)

          if (payload.new.enabled && payload.new.metadata) {
            await registerStandupSchedule(payload.new.owner, payload.new.metadata)
          }
        }
      },
    )
    .subscribe()
}
