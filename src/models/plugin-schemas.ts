/**
 * JSON Schema definitions for plugin configurations
 * These schemas define the structure and UI hints for each plugin's metadata
 */

export interface PluginSchemaProperty {
  type: 'string' | 'boolean' | 'number' | 'array' | 'object'
  title: string
  description?: string
  default?: unknown
  uiWidget?: 'text' | 'textarea' | 'channel-select' | 'role-select' | 'cron' | 'toggle' | 'password'
  placeholder?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  items?: PluginSchemaProperty | PluginObjectSchema
  properties?: Record<string, PluginSchemaProperty>
  required?: string[]
  readOnly?: boolean
  encrypted?: boolean
}

export interface PluginObjectSchema {
  type: 'object' | 'array'
  title?: string
  description?: string
  properties?: Record<string, PluginSchemaProperty>
  items?: PluginObjectSchema | PluginSchemaProperty
  required?: string[]
  minItems?: number
  maxItems?: number
}

export type PluginSchema = PluginObjectSchema

/**
 * Schema definitions for all plugins
 */
export const pluginSchemas: Record<string, PluginSchema> = {
  serverMembersActivity: {
    type: 'object',
    title: 'Server Members Activity',
    description: 'Configure notifications for member join/leave events',
    properties: {
      channelId: {
        type: 'string',
        title: 'Notification Channel',
        description: 'Channel where join/leave notifications will be sent',
        uiWidget: 'channel-select',
      },
    },
    required: ['channelId'],
  },

  serverMessagesLogs: {
    type: 'object',
    title: 'Server Messages Logs',
    description: 'Configure logging for deleted and edited messages',
    properties: {
      channelId: {
        type: 'string',
        title: 'Log Channel',
        description: 'Channel where message logs will be sent',
        uiWidget: 'channel-select',
      },
    },
    required: ['channelId'],
  },

  removeLinks: {
    type: 'object',
    title: 'Remove Links',
    description: 'Automatically remove links from messages with optional allowlists',
    properties: {
      allowedRoles: {
        type: 'array',
        title: 'Allowed Roles',
        description: 'Roles that are allowed to post links',
        items: {
          type: 'string',
          title: 'Role',
          uiWidget: 'role-select',
        },
      },
      allowedLinks: {
        type: 'array',
        title: 'Allowed Domains',
        description: 'Domains that are allowed (e.g., discord.com, github.com)',
        items: {
          type: 'string',
          title: 'Domain',
          placeholder: 'domain.com',
        },
      },
    },
  },

  chatGtp: {
    type: 'object',
    title: 'ChatGPT Integration',
    description: 'Configure ChatGPT API credentials for AI conversations',
    properties: {
      api_key: {
        type: 'string',
        title: 'API Key',
        description: 'Your OpenAI API key',
        uiWidget: 'password',
        encrypted: true,
        placeholder: 'sk-...',
      },
      org: {
        type: 'string',
        title: 'Organization ID',
        description: 'Your OpenAI organization ID (optional)',
        uiWidget: 'password',
        encrypted: true,
        placeholder: 'org-...',
      },
      usage: {
        type: 'number',
        title: 'Daily Usage',
        description: 'Number of API calls made today',
        readOnly: true,
        default: 0,
      },
    },
    required: ['api_key'],
  },

  threads: {
    type: 'array',
    title: 'Thread Configurations',
    description: 'Configure automatic thread creation for channels',
    items: {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          title: 'Channel',
          description: 'Channel where threads will be created',
          uiWidget: 'channel-select',
        },
        title: {
          type: 'string',
          title: 'Thread Title Template',
          description: 'Template for thread titles. Use {author} for the message author',
          placeholder: 'Discussion by {author}',
        },
        autoMessage: {
          type: 'string',
          title: 'Auto Message',
          description: 'Message to post automatically in new threads',
          uiWidget: 'textarea',
          placeholder: 'Welcome to the discussion!',
        },
        enabled: {
          type: 'boolean',
          title: 'Enabled',
          description: 'Enable thread creation for this channel',
          default: true,
          uiWidget: 'toggle',
        },
      },
      required: ['channelId'],
    },
    minItems: 0,
    maxItems: 10,
  },

  events: {
    type: 'object',
    title: 'Events Calendar',
    description: 'Configure calendar integration for Discord events',
    properties: {
      channelId: {
        type: 'string',
        title: 'Events Channel',
        description: 'Channel where event reminders and calendar links will be posted',
        uiWidget: 'channel-select',
      },
    },
    required: ['channelId'],
  },

  verify: {
    type: 'object',
    title: 'Verification System',
    description: 'Configure captcha verification for new members',
    properties: {
      role: {
        type: 'string',
        title: 'Verified Role',
        description: 'Role to assign after successful verification',
        uiWidget: 'role-select',
      },
    },
    required: ['role'],
  },

  standup: {
    type: 'array',
    title: 'Standup Schedules',
    description: 'Configure scheduled standup reminders',
    items: {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          title: 'Channel',
          description: 'Channel where standup reminders will be posted',
          uiWidget: 'channel-select',
        },
        expression: {
          type: 'string',
          title: 'Schedule (Cron)',
          description: 'Cron expression for scheduling (e.g., "0 9 * * 1-5" for weekdays at 9 AM)',
          uiWidget: 'cron',
          placeholder: '0 9 * * 1-5',
        },
        role: {
          type: 'string',
          title: 'Mention Role',
          description: 'Role to mention in standup reminders',
          uiWidget: 'role-select',
        },
        message: {
          type: 'string',
          title: 'Reminder Message',
          description: 'Custom message for the standup reminder',
          uiWidget: 'textarea',
          placeholder: "Time for standup! Share your updates.",
        },
      },
      required: ['channelId', 'expression'],
    },
    minItems: 0,
    maxItems: 5,
  },

  summarize: {
    type: 'object',
    title: 'Text Summarization',
    description: 'AI-powered text summarization (no configuration required)',
    properties: {},
  },

  twitch: {
    type: 'object',
    title: 'Twitch Integration',
    description: 'Twitch streamer information lookup (no configuration required)',
    properties: {},
  },

  textClassification: {
    type: 'object',
    title: 'Text Classification',
    description: 'Sentiment analysis using ML models (no configuration required)',
    properties: {},
  },

  quests: {
    type: 'object',
    title: 'Quests System',
    description: 'Configure gamified engagement with quizzes and raffles',
    properties: {
      defaultChannel: {
        type: 'string',
        title: 'Default Channel',
        description: 'Default channel for quest announcements',
        uiWidget: 'channel-select',
      },
      moderatorRole: {
        type: 'string',
        title: 'Moderator Role',
        description: 'Role that can create and manage quests',
        uiWidget: 'role-select',
      },
    },
  },
}

/**
 * Get schema for a specific plugin
 */
export function getPluginSchema(pluginName: string): PluginSchema | null {
  return pluginSchemas[pluginName] || null
}

/**
 * Check if a plugin has configurable options
 */
export function isPluginConfigurable(pluginName: string): boolean {
  const schema = pluginSchemas[pluginName]
  if (!schema) return false

  if (schema.type === 'array') return true
  if (schema.type === 'object' && schema.properties) {
    return Object.keys(schema.properties).length > 0
  }
  return false
}
