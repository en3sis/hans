import { and, eq } from 'drizzle-orm'
import { db } from '../../libs/drizzle'
import { guilds, guildsPlugins } from '../../db/schema'
import type { AuthenticatedRequest } from '../middleware/auth'
import { verifyGuildAccess } from '../utils/discord'

interface UpdatePluginBody {
  enabled?: boolean
  metadata?: Record<string, unknown>
}

export const handlePluginsRoutes = {
  /**
   * PATCH /api/v1/guilds/:guildId/plugins/:pluginName
   * Update plugin settings (enabled, metadata)
   */
  async update(req: AuthenticatedRequest, params: Record<string, string>): Promise<Response> {
    const { guildId, pluginName } = params

    // Verify user has access to this guild
    const { hasAccess } = await verifyGuildAccess(req.accessToken, guildId)

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

    // Parse request body
    let body: UpdatePluginBody
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Find the guild plugin record
    const [existingPlugin] = await db
      .select()
      .from(guildsPlugins)
      .where(and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, pluginName)))

    if (!existingPlugin) {
      return new Response(JSON.stringify({ error: 'Plugin not found for this guild' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build update object
    const updateData: { enabled?: boolean; metadata?: unknown } = {}

    if (typeof body.enabled === 'boolean') {
      updateData.enabled = body.enabled
    }

    if (body.metadata !== undefined) {
      // Merge with existing metadata
      const existingMetadata =
        typeof existingPlugin.metadata === 'object' && existingPlugin.metadata !== null
          ? existingPlugin.metadata
          : {}
      updateData.metadata = { ...existingMetadata, ...body.metadata }
    }

    // Update the plugin
    await db
      .update(guildsPlugins)
      .set(updateData)
      .where(and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, pluginName)))

    // Fetch updated record
    const [updatedPlugin] = await db
      .select()
      .from(guildsPlugins)
      .where(and(eq(guildsPlugins.owner, guildId), eq(guildsPlugins.name, pluginName)))

    return new Response(
      JSON.stringify({
        name: updatedPlugin.name,
        enabled: updatedPlugin.enabled,
        metadata: updatedPlugin.metadata,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  },
}
