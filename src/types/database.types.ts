export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      configs: {
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
          id: number
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
      guilds: {
        Row: {
          avatar: string | null
          created_at: string | null
          guild_id: string
          id: number
          name: string | null
          premium: boolean | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          guild_id: string
          id?: number
          name?: string | null
          premium?: boolean | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          guild_id?: string
          id?: number
          name?: string | null
          premium?: boolean | null
        }
      }
      'guilds-plugins': {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: number
          metadata: Json | null
          name: string | null
          owner: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: number
          metadata?: Json | null
          name?: string | null
          owner?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: number
          metadata?: Json | null
          name?: string | null
          owner?: string | null
        }
      }
      plugins: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: number
          name: string | null
          premium: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: number
          name?: string | null
          premium?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: number
          name?: string | null
          premium?: boolean | null
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
