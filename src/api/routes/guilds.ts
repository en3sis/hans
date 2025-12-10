import { eq } from 'drizzle-orm'
import { ChannelType } from 'discord.js'
import { db } from '../../libs/drizzle'
import { guilds, guildsPlugins, plugins } from '../../db/schema'
import type { AuthenticatedRequest } from '../middleware/auth'
import { fetchUserGuilds, filterManageableGuilds, verifyGuildAccess } from '../utils/discord'
import { Hans } from '../../index'

export const handleGuildsRoutes = {
  /**
   * GET /api/v1/guilds
   * Returns guilds where user is owner OR has Administrator permission,
   * and bot is present (exists in DB)
   */
  async list(req: AuthenticatedRequest, _params: Record<string, string>): Promise<Response> {
    // Get user's guilds from Discord
    const userGuilds = await fetchUserGuilds(req.accessToken)
    const manageableGuilds = filterManageableGuilds(userGuilds)

    if (manageableGuilds.length === 0) {
      return new Response(JSON.stringify({ guilds: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get guild IDs that the bot is in
    const guildIds = manageableGuilds.map((g) => g.id)
    const botGuilds = await db.select().from(guilds)

    // Filter to only guilds where bot is present
    const botGuildIds = new Set(botGuilds.map((g) => g.guildId))
    const accessibleGuilds = manageableGuilds.filter((g) => botGuildIds.has(g.id))

    // Merge Discord data with DB data
    const result = accessibleGuilds.map((discordGuild) => {
      const dbGuild = botGuilds.find((g) => g.guildId === discordGuild.id)
      return {
        id: discordGuild.id,
        name: discordGuild.name,
        icon: discordGuild.icon,
        owner: discordGuild.owner,
        premium: dbGuild?.premium ?? false,
      }
    })

    return new Response(JSON.stringify({ guilds: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },

  /**
   * GET /api/v1/guilds/:guildId
   * Returns guild details + plugins
   */
  async get(req: AuthenticatedRequest, params: Record<string, string>): Promise<Response> {
    const { guildId } = params

    // Verify user has access to this guild
    const { hasAccess, guild: discordGuild } = await verifyGuildAccess(req.accessToken, guildId)

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if bot is in this guild
    const [dbGuild] = await db.select().from(guilds).where(eq(guilds.guildId, guildId))

    if (!dbGuild) {
      return new Response(JSON.stringify({ error: 'Bot is not in this guild' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get all plugins for this guild
    const guildPluginsData = await db
      .select({
        name: guildsPlugins.name,
        enabled: guildsPlugins.enabled,
        metadata: guildsPlugins.metadata,
        plugin: {
          name: plugins.name,
          description: plugins.description,
          category: plugins.category,
          premium: plugins.premium,
        },
      })
      .from(guildsPlugins)
      .leftJoin(plugins, eq(guildsPlugins.name, plugins.name))
      .where(eq(guildsPlugins.owner, guildId))

    return new Response(
      JSON.stringify({
        guild: {
          id: dbGuild.guildId,
          name: dbGuild.name ?? discordGuild?.name,
          avatar: dbGuild.avatar,
          premium: dbGuild.premium,
          createdAt: dbGuild.createdAt,
        },
        plugins: guildPluginsData.map((p) => ({
          name: p.name,
          enabled: p.enabled ?? false,
          metadata: p.metadata ?? {},
          plugin: p.plugin,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  },

  /**
   * GET /api/v1/guilds/:guildId/channels
   * Returns text channels from bot's cache
   */
  async getChannels(req: AuthenticatedRequest, params: Record<string, string>): Promise<Response> {
    const { guildId } = params

    // Verify user has access to this guild
    const { hasAccess } = await verifyGuildAccess(req.accessToken, guildId)

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get guild from bot's cache
    const guild = Hans.guilds.cache.get(guildId)

    if (!guild) {
      return new Response(JSON.stringify({ error: 'Bot is not in this guild' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get text channels from cache
    const channels = guild.channels.cache
      .filter((channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        position: channel.position,
      }))
      .sort((a, b) => a.position - b.position)

    return new Response(JSON.stringify({ channels }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },

  /**
   * GET /api/v1/guilds/:guildId/roles
   * Returns roles from bot's cache
   */
  async getRoles(req: AuthenticatedRequest, params: Record<string, string>): Promise<Response> {
    const { guildId } = params

    // Verify user has access to this guild
    const { hasAccess } = await verifyGuildAccess(req.accessToken, guildId)

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get guild from bot's cache
    const guild = Hans.guilds.cache.get(guildId)

    if (!guild) {
      return new Response(JSON.stringify({ error: 'Bot is not in this guild' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get roles from cache (exclude @everyone role)
    const roles = guild.roles.cache
      .filter((role) => role.id !== guildId) // @everyone has same ID as guild
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        managed: role.managed, // Bot/integration managed roles
      }))
      .sort((a, b) => b.position - a.position) // Higher position first

    return new Response(JSON.stringify({ roles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
}
