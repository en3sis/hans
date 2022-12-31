export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      config: {
        Row: {
          activity_name: string | null
          activity_type: number | null
          bot_dev_folder: string | null
          bot_guild_id: string | null
          bot_id: string
          created_at: string | null
          disable_commands: string[] | null
          discord_client_id: string | null
          id: number
          name: string | null
          notify_channel_id: string | null
          perma_invite: string | null
          website: string | null
        }
        Insert: {
          activity_name?: string | null
          activity_type?: number | null
          bot_dev_folder?: string | null
          bot_guild_id?: string | null
          bot_id: string
          created_at?: string | null
          disable_commands?: string[] | null
          discord_client_id?: string | null
          id?: number
          name?: string | null
          notify_channel_id?: string | null
          perma_invite?: string | null
          website?: string | null
        }
        Update: {
          activity_name?: string | null
          activity_type?: number | null
          bot_dev_folder?: string | null
          bot_guild_id?: string | null
          bot_id?: string
          created_at?: string | null
          disable_commands?: string[] | null
          discord_client_id?: string | null
          id?: number
          name?: string | null
          notify_channel_id?: string | null
          perma_invite?: string | null
          website?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
