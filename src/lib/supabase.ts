import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

/* Work with Supabase Locally
 https://supabase.com/docs/guides/resources/supabase-cli/managing-environments#set-up-a-local-environment
*/

const supabase = createClient<Database>(
  !process.env.ISDEV ? process.env.SUPABASE_URL : 'http://localhost:54321',
  !process.env.ISDEV
    ? process.env.SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
)

export default supabase
