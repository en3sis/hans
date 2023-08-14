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
          discord_client_id: string | null
          id: number
          monitoring_channel_id: string | null
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
          discord_client_id?: string | null
          id: number
          monitoring_channel_id?: string | null
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
          discord_client_id?: string | null
          id?: number
          monitoring_channel_id?: string | null
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
      guilds_plugins: {
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
      users_settings: {
        Row: {
          created_at: string | null
          id: number
          metadata: Json | null
          type: Database['public']['Enums']['user_settings_type'] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          metadata?: Json | null
          type?: Database['public']['Enums']['user_settings_type'] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          metadata?: Json | null
          type?: Database['public']['Enums']['user_settings_type'] | null
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_chat_gpt_plugin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_settings_type: 'timezone'
    }
  }
}
