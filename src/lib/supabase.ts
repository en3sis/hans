import { Database } from '@/types/database.types'
import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database

const supabase = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROL)

export default supabase
