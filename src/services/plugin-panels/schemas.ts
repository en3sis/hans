import { ChannelType } from 'discord.js'
import type { PluginName } from '../../models/plugins.model'
import { DEFAULT_OPENAI_MODEL, OPENAI_MODELS } from '../../utils/openai-models'
import type { PluginPanelRegistry } from './types'

/**
 * Declarative settings for every plugin. To add new configuration to a
 * plugin, add or edit its entry here — the panel UI, modal, validation
 * and persistence layer all derive from this.
 *
 * Plugins absent from this map (or mapped to `{}`) render as toggle-only.
 */
export const PLUGIN_PANELS: PluginPanelRegistry = {
  chatGtp: {
    fields: [
      {
        key: 'api_key',
        label: 'API key',
        description: 'Stored encrypted (aes-256-cbc).',
        required: true,
        kind: { type: 'secret', max: 200, placeholder: 'sk-…' },
      },
      {
        key: 'org',
        label: 'Organization ID',
        required: true,
        kind: { type: 'secret', max: 100, placeholder: 'org-…' },
      },
      {
        key: 'model',
        label: 'Model',
        description: `OpenAI model used for /ask. Defaults to ${DEFAULT_OPENAI_MODEL}.`,
        kind: {
          type: 'choice',
          placeholder: `Pick a model (default: ${DEFAULT_OPENAI_MODEL})`,
          options: OPENAI_MODELS.map((m) => ({
            value: m.id,
            label: `${m.label} — $${m.inputPerMTokens}/$${m.outputPerMTokens} per 1M in/out`,
            description: m.description,
          })),
        },
      },
    ],
  },

  verify: {
    fields: [
      {
        key: 'role',
        label: 'Verified role',
        description: 'Role assigned after the user solves the captcha.',
        required: true,
        kind: { type: 'role' },
      },
      {
        key: 'channelId',
        label: 'Captcha channel',
        description: 'Where the captcha button is posted (e.g. #verify, #welcome).',
        kind: { type: 'channel', channelTypes: [ChannelType.GuildText] },
      },
    ],
    customActions: [
      {
        id: 'postButton',
        label: 'Post captcha message',
        style: 'primary',
        description:
          'Posts the captcha message + Verify button to the configured channel (or this channel if none).',
      },
    ],
  },

  serverMembersActivity: {
    fields: [
      {
        key: 'channelId',
        label: 'Notification channel',
        required: true,
        kind: { type: 'channel', channelTypes: [ChannelType.GuildText] },
      },
    ],
  },

  serverMessagesLogs: {
    fields: [
      {
        key: 'channelId',
        label: 'Log channel',
        required: true,
        kind: { type: 'channel', channelTypes: [ChannelType.GuildText] },
      },
    ],
  },

  threads: {
    list: {
      idKey: 'channelId',
      addLabel: 'Add channel',
      summary: (item) => {
        const ch = `<#${item.channelId}>`
        const title = item.title ? ` · *${item.title}*` : ''
        const msg = item.autoMessage ? ` · 💬` : ''
        return `${ch}${title}${msg}`
      },
      fields: [
        {
          key: 'channelId',
          label: 'Channel',
          required: true,
          kind: {
            type: 'channel',
            channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
          },
        },
        {
          key: 'title',
          label: 'Thread title',
          description: 'Title of each auto-created thread (optional).',
          kind: { type: 'string', max: 80, placeholder: 'Discussion' },
        },
        {
          key: 'autoMessage',
          label: 'Welcome message',
          description: 'Message posted into the new thread (optional).',
          kind: { type: 'text', max: 1000 },
        },
      ],
    },
  },

  standup: {
    list: {
      idKey: 'channelId',
      addLabel: 'Add schedule',
      summary: (item) => {
        const ch = item.channelId ? `<#${item.channelId}>` : '_no channel_'
        const hour = typeof item.hour === 'number' ? `${String(item.hour).padStart(2, '0')}:00 UTC` : '–'
        const days = Array.isArray(item.days) && item.days.length > 0
          ? (item.days as string[]).join(', ')
          : 'no days'
        const role = item.role ? ` · <@&${item.role}>` : ''
        return `${ch} · ${hour} · ${days}${role}`
      },
      fields: [
        {
          key: 'channelId',
          label: 'Channel',
          required: true,
          kind: { type: 'channel', channelTypes: [ChannelType.GuildText] },
        },
        {
          key: 'hour',
          label: 'Hour (UTC)',
          description: 'When the bot posts the standup prompt.',
          required: true,
          kind: { type: 'hour' },
        },
        {
          key: 'days',
          label: 'Days',
          description: 'Days of week to post.',
          required: true,
          kind: { type: 'weekdays' },
        },
        {
          key: 'role',
          label: 'Mention role',
          description: 'Optional role to mention.',
          kind: { type: 'role' },
        },
        {
          key: 'message',
          label: 'Prompt message',
          required: true,
          kind: { type: 'text', max: 1000, placeholder: 'How is everyone doing today?' },
        },
      ],
    },
    // Build the cron expression from hour + days so the existing
    // registerStandupSchedules consumer keeps working unchanged.
    transform: (item) => {
      const hour = typeof item.hour === 'number' ? item.hour : null
      const days = Array.isArray(item.days) ? (item.days as string[]) : []
      if (hour === null || days.length === 0) return item
      const dayMap: Record<string, number> = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      }
      const nums = days
        .map((d) => dayMap[d])
        .filter((n): n is number => n !== undefined)
        .sort((a, b) => a - b)
        .join(',')
      return { ...item, expression: `0 ${hour} * * ${nums || '*'}` }
    },
  },

  removeLinks: {
    fields: [
      {
        key: 'allowedRoles',
        label: 'Bypass roles',
        description: 'Members with any of these roles can post links freely.',
        kind: { type: 'role', multi: true },
      },
      {
        key: 'allowedUrls',
        label: 'Allowed URLs',
        description:
          'One per line. Bare hostnames (github.com) or full regex (^https?://.*\\.youtube\\.com).',
        kind: {
          type: 'text',
          max: 2000,
          placeholder: 'github.com\nyoutube.com\n^https?://docs\\..*',
        },
      },
    ],
  },

  quests: {
    fields: [
      {
        key: 'defaultChannelId',
        label: 'Default quest channel',
        description: 'Suggested channel when creating new quests.',
        kind: { type: 'channel', channelTypes: [ChannelType.GuildText] },
      },
      {
        key: 'notifyRoleId',
        label: 'Notification role',
        description: 'Mentioned in the quest message when a new quest is posted.',
        kind: { type: 'role' },
      },
      {
        key: 'moderatorRoles',
        label: 'Quest moderator roles',
        description:
          'Roles allowed to manage quests (advisory — Discord still enforces the Manage Server permission).',
        kind: { type: 'role', multi: true },
      },
    ],
    customActions: [
      {
        id: 'create',
        label: 'Create new quest',
        style: 'primary',
        description: 'Open the create-quest wizard.',
      },
      {
        id: 'list',
        label: 'Manage active quests',
        style: 'secondary',
        description: 'List, inspect, draw winners, or cancel active quests.',
      },
    ],
  },

  // Toggle-only plugins — no configuration. Listed here for explicitness;
  // schemas can be added later without touching renderer/router code.
  twitch: {},
}

export const getPanelSchema = (name: PluginName) => PLUGIN_PANELS[name] ?? {}
