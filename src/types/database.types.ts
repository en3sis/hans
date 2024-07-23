export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
          monitoring_channel_id?: string | null
          name?: string | null
          notify_channel_id?: string | null
          perma_invite?: string | null
          website?: string | null
        }
        Relationships: []
      }
      guilds: {
        Row: {
          avatar: string | null
          created_at: string | null
          guild_id: string
          name: string | null
          premium: boolean | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          guild_id: string
          name?: string | null
          premium?: boolean | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          guild_id?: string
          name?: string | null
          premium?: boolean | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'guilds_plugins_name_fkey'
            columns: ['name']
            isOneToOne: false
            referencedRelation: 'plugins'
            referencedColumns: ['name']
          },
          {
            foreignKeyName: 'guilds_plugins_owner_fkey'
            columns: ['owner']
            isOneToOne: false
            referencedRelation: 'guilds'
            referencedColumns: ['guild_id']
          },
        ]
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
        Relationships: []
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
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
