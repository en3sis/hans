import { setPresence } from '../controllers/bot/config.controller'
import supabase from '../libs/supabase'

export const configsRealtime = () => {
  return supabase
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
}
