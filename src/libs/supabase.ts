import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

// Create a single supabase client for interacting with your database

const supabase = createClient<Database>(
  !process.env.ISDEV ? process.env.SUPABASE_URL : 'http://localhost:54321',
  !process.env.ISDEV
    ? process.env.SUPABASE_SERVICE_ROL
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
)

export default supabase
