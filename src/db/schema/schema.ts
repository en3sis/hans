import { pgTable, integer, text, unique, boolean, foreignKey, jsonb, check, uuid, timestamp, primaryKey, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userSettingsType = pgEnum("user_settings_type", ['timezone'])


export const configs = pgTable("configs", {
	id: integer().primaryKey().notNull(),
	botId: text("bot_id").notNull(),
	botGuildId: text("bot_guild_id"),
	activityName: text("activity_name"),
	activityType: integer("activity_type"),
	botDevFolder: text("bot_dev_folder"),
	createdAt: text("created_at"),
	discordClientId: text("discord_client_id"),
	name: text(),
	notifyChannelId: text("notify_channel_id"),
	permaInvite: text("perma_invite"),
	website: text(),
	monitoringChannelId: text("monitoring_channel_id"),
});

export const plugins = pgTable("plugins", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "plugins_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text(),
	description: text(),
	enabled: boolean(),
	premium: boolean(),
	category: text().default('miscellaneous'),
	createdAt: text("created_at"),
}, (table) => [
	unique("plugins_name_key").on(table.name),
]);

export const guildsPlugins = pgTable("guilds_plugins", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "guilds_plugins_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text(),
	owner: text(),
	enabled: boolean(),
	metadata: jsonb(),
	createdAt: text("created_at"),
}, (table) => [
	foreignKey({
			columns: [table.name],
			foreignColumns: [plugins.name],
			name: "guilds_plugins_name_fkey"
		}),
	foreignKey({
			columns: [table.owner],
			foreignColumns: [guilds.guildId],
			name: "guilds_plugins_owner_fkey"
		}).onDelete("cascade"),
]);

export const guilds = pgTable("guilds", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "guilds_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	guildId: text("guild_id").notNull(),
	avatar: text(),
	name: text(),
	premium: boolean().default(false),
	createdAt: text("created_at"),
}, (table) => [
	unique("guilds_guild_id_key").on(table.guildId),
]);

export const guildQuests = pgTable("guild_quests", {
	id: uuid().primaryKey().notNull(),
	guildId: integer("guild_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	question: text(),
	answer: text(),
	mode: text().notNull(),
	winnersCount: integer("winners_count"),
	reward: text().notNull(),
	rewardCode: text("reward_code"),
	channelId: text("channel_id").notNull(),
	threadId: text("thread_id"),
	messageId: text("message_id"),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expirationDate: timestamp("expiration_date", { withTimezone: true, mode: 'string' }).notNull(),
	isClaimed: boolean("is_claimed").default(false).notNull(),
	isPendingClaim: boolean("is_pending_claim").default(false).notNull(),
	winner: jsonb(),
	winners: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.guildId],
			foreignColumns: [guilds.id],
			name: "guild_quests_guild_id_fkey"
		}).onDelete("cascade"),
	unique("guild_quests_guild_id_idx").on(table.id, table.guildId),
	check("guild_quests_mode_check", sql`mode = ANY (ARRAY['quiz'::text, 'raffle'::text])`),
]);

export const usersSettings = pgTable("users_settings", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).generatedByDefaultAsIdentity({ name: "users_settings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userId: text("user_id").notNull(),
	metadata: jsonb(),
	type: userSettingsType(),
}, (table) => [
	primaryKey({ columns: [table.id, table.userId], name: "users_settings_pkey"}),
]);
