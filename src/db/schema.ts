/**
 * Drizzle schema — single source of truth.
 *
 * To change the schema:
 *   1. Edit this file.
 *   2. Run `yarn db:generate` — drizzle-kit produces a SQL migration in /drizzle.
 *   3. Commit the new file. On deploy, the migrate service applies it.
 *
 * Row types are derived from the schema with `.$inferSelect` / `.$inferInsert`.
 */
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ENUMs ---------------------------------------------------------------

export const userSettingsType = pgEnum('user_settings_type', ['timezone'])

// Tables --------------------------------------------------------------

export const configs = pgTable('configs', {
  id: integer('id').primaryKey(),
  bot_id: text('bot_id').notNull(),
  bot_guild_id: text('bot_guild_id'),
  activity_name: text('activity_name'),
  activity_type: integer('activity_type'),
  bot_dev_folder: text('bot_dev_folder'),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  discord_client_id: text('discord_client_id'),
  name: text('name'),
  notify_channel_id: text('notify_channel_id'),
  perma_invite: text('perma_invite'),
  website: text('website'),
  monitoring_channel_id: text('monitoring_channel_id'),
})

export const guilds = pgTable('guilds', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  guild_id: text('guild_id').notNull().unique(),
  avatar: text('avatar'),
  name: text('name'),
  premium: boolean('premium').default(false),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const plugins = pgTable('plugins', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').unique().notNull(),
  description: text('description').notNull(),
  enabled: boolean('enabled').notNull(),
  premium: boolean('premium').notNull(),
  category: text('category').default('miscellaneous').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const guildsPlugins = pgTable(
  'guilds_plugins',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    name: text('name')
      .notNull()
      .references(() => plugins.name),
    owner: text('owner')
      .notNull()
      .references(() => guilds.guild_id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: jsonb('metadata').$type<any>(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (t) => [index('idx_guilds_plugins_owner_name').on(t.owner, t.name)],
)

export const usersSettings = pgTable(
  'users_settings',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    user_id: text('user_id').notNull(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: jsonb('metadata').$type<any>(),
    type: userSettingsType('type'),
  },
  (t) => [uniqueIndex('users_settings_user_id_type_key').on(t.user_id, t.type)],
)

export const guildQuests = pgTable(
  'guild_quests',
  {
    id: uuid('id').primaryKey(),
    guild_id: integer('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    question: text('question'),
    answer: text('answer'),
    mode: text('mode').notNull(),
    winners_count: integer('winners_count'),
    reward: text('reward').notNull(),
    reward_code: text('reward_code'),
    channel_id: text('channel_id').notNull(),
    thread_id: text('thread_id'),
    message_id: text('message_id'),
    created_by: text('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    expiration_date: timestamp('expiration_date', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    is_claimed: boolean('is_claimed').notNull().default(false),
    is_pending_claim: boolean('is_pending_claim').notNull().default(false),
    winner: jsonb('winner').$type<{
      id: string
      username: string
      claimed_at: string
      dm_sent: boolean
      dm_failed?: boolean
    } | null>(),
    winners: jsonb('winners').$type<Array<{
      id: string
      username: string
      selected_at: string
      dm_sent: boolean
      dm_failed?: boolean
      reward_code?: string
    }> | null>(),
  },
  (t) => [
    index('idx_guild_quests_guild').on(t.guild_id),
    check('guild_quests_mode_check', sql`${t.mode} IN ('quiz', 'raffle')`),
  ],
)

/**
 * Anonymous audit log of slash-command and feature invocations.
 * Tracks the guild and the command name only — never the user — so it can
 * be used for prioritising features without retaining personal data.
 */
export const commandUsage = pgTable(
  'command_usage',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    guild_id: text('guild_id'),
    command_name: text('command_name').notNull(),
    feature_name: text('feature_name'),
    source: text('source').notNull().default('slash'),
    success: boolean('success').notNull().default(true),
    duration_ms: integer('duration_ms'),
    invoked_at: timestamp('invoked_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_command_usage_guild_time').on(t.guild_id, t.invoked_at.desc()),
    index('idx_command_usage_command_time').on(t.command_name, t.invoked_at.desc()),
    index('idx_command_usage_guild_command').on(t.guild_id, t.command_name),
  ],
)

// Inferred row types --------------------------------------------------

export type Config = typeof configs.$inferSelect
export type ConfigInsert = typeof configs.$inferInsert
export type Guild = typeof guilds.$inferSelect
export type GuildInsert = typeof guilds.$inferInsert
export type Plugin = typeof plugins.$inferSelect
export type PluginInsert = typeof plugins.$inferInsert
export type GuildPluginRow = typeof guildsPlugins.$inferSelect
export type GuildPluginInsert = typeof guildsPlugins.$inferInsert
export type UserSettings = typeof usersSettings.$inferSelect
export type UserSettingsInsert = typeof usersSettings.$inferInsert
export type GuildQuestRow = typeof guildQuests.$inferSelect
export type GuildQuestInsert = typeof guildQuests.$inferInsert
export type CommandUsageRow = typeof commandUsage.$inferSelect
export type CommandUsageInsert = typeof commandUsage.$inferInsert
