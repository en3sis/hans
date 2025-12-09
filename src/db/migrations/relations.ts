import { relations } from "drizzle-orm/relations";
import { plugins, guildsPlugins, guilds, guildQuests } from "./schema";

export const guildsPluginsRelations = relations(guildsPlugins, ({one}) => ({
	plugin: one(plugins, {
		fields: [guildsPlugins.name],
		references: [plugins.name]
	}),
	guild: one(guilds, {
		fields: [guildsPlugins.owner],
		references: [guilds.guildId]
	}),
}));

export const pluginsRelations = relations(plugins, ({many}) => ({
	guildsPlugins: many(guildsPlugins),
}));

export const guildsRelations = relations(guilds, ({many}) => ({
	guildsPlugins: many(guildsPlugins),
	guildQuests: many(guildQuests),
}));

export const guildQuestsRelations = relations(guildQuests, ({one}) => ({
	guild: one(guilds, {
		fields: [guildQuests.guildId],
		references: [guilds.id]
	}),
}));