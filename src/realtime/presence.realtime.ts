import { setPresence } from '../controllers/bot/config.controller'
import { registerStandupSchedules } from '../controllers/plugins/standup.controller'
import { stopSpecificCronJob } from '../controllers/tasks/cron-jobs'
import { deleteFromCache } from '../libs/node-cache'
import supabase from '../libs/supabase'

export const configsRealtime = () => {
  // Listen for changes in the configs table
  supabase
    .channel('bot-configs-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'configs',
      },
      async (payload) => {
        if (!!process.env.ISDEV) {
          console.log('Guild plugin updated:', payload.new)
        }

        await setPresence(payload.new.activity_type, payload.new.activity_name)
      },
    )
    .subscribe()

  // Listen for changes in the guilds plugins table and delete the cached data
  supabase
    .channel('guilds-plugins-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'guilds_plugins',
      },
      async (payload) => {
        if (!!process.env.ISDEV) {
          console.log('Guild plugin updated:', payload.new)
        }

        // INFO: Refresh the cache for the guild plugins
        deleteFromCache(`guildPlugins:${payload.new.owner}:${payload.new.name}`)

        if (payload.new.name === 'standup') {
          stopSpecificCronJob(`${payload.new.owner}#standup`)

          if (payload.new.enabled && payload.new.metadata) {
            await registerStandupSchedules(payload.new.owner, payload.new.metadata)
          }
        }
      },
    )
    .subscribe()
}
