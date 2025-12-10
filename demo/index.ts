import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { Client, GatewayIntentBits } from 'discord.js'
import { config } from 'dotenv'
import { guilds, guildsPlugins } from '../src/db/schema'
import { eq, isNotNull } from 'drizzle-orm'

config()

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://hans:password@localhost:5432/hans_db'
const DISCORD_TOKEN = process.env.DISCORD_TOKEN

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is required in .env')
  process.exit(1)
}

const client = postgres(DATABASE_URL)
const db = drizzle(client)

// Discord client - only needs Guilds intent for member count
const discord = new Client({ intents: [GatewayIntentBits.Guilds] })

// Cache for guild member counts (avoid repeated API calls)
const memberCountCache = new Map<string, { count: number | null; fetchedAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getMemberCount(guildId: string): Promise<number | null> {
  const cached = memberCountCache.get(guildId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.count
  }

  try {
    const guild = discord.guilds.cache.get(guildId)
    if (guild) {
      const count = guild.memberCount
      memberCountCache.set(guildId, { count, fetchedAt: Date.now() })
      return count
    }
  } catch {
    // Guild not accessible
  }

  memberCountCache.set(guildId, { count: null, fetchedAt: Date.now() })
  return null
}

// Wait for Discord client to be ready
let discordReady = false
discord.once('clientReady', () => {
  console.log(`Discord client ready as ${discord.user?.tag}`)
  console.log(`Connected to ${discord.guilds.cache.size} guilds`)
  discordReady = true
})

discord.login(DISCORD_TOKEN)

const server = Bun.serve({
  port: 3009,
  async fetch(req: Request) {
    const url = new URL(req.url)

    if (url.pathname === '/') {
      if (!discordReady) {
        return new Response('Discord client is connecting... please refresh in a moment.', {
          headers: { 'Content-Type': 'text/html' },
        })
      }

      const allGuilds = await db.select().from(guilds)

      // Get plugins with non-null metadata for each guild
      const allPlugins = await db
        .select({
          owner: guildsPlugins.owner,
          name: guildsPlugins.name,
          enabled: guildsPlugins.enabled,
          metadata: guildsPlugins.metadata,
        })
        .from(guildsPlugins)
        .where(isNotNull(guildsPlugins.metadata))

      // Group plugins by guild
      const pluginsByGuild = new Map<string, { name: string; enabled: boolean }[]>()
      for (const p of allPlugins) {
        if (!p.owner || !p.name) continue
        // Only include if metadata is not empty/null object
        if (p.metadata && typeof p.metadata === 'object' && Object.keys(p.metadata).length > 0) {
          if (!pluginsByGuild.has(p.owner)) {
            pluginsByGuild.set(p.owner, [])
          }
          pluginsByGuild.get(p.owner)!.push({ name: p.name, enabled: p.enabled ?? false })
        }
      }

      // Get member counts from cache (already populated by Discord.js)
      const guildsWithMembers = allGuilds.map((g) => ({
        ...g,
        memberCount: getMemberCountSync(g.guildId),
        plugins: g.guildId ? pluginsByGuild.get(g.guildId) || [] : [],
      }))

      function getMemberCountSync(guildId: string | null): number | null {
        if (!guildId) return null
        const guild = discord.guilds.cache.get(guildId)
        return guild?.memberCount ?? null
      }

      const connectedCount = guildsWithMembers.filter((g) => g.memberCount !== null).length
      const totalMembers = guildsWithMembers.reduce((sum, g) => sum + (g.memberCount || 0), 0)

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Hans - Guilds</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #fff;
      padding: 2rem;
    }
    h1 { margin-bottom: 0.5rem; color: #5865F2; }
    .stats { margin-bottom: 1.5rem; color: #888; }
    .stats span { color: #5865F2; font-weight: 600; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .guild {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s, background 0.2s;
    }
    .guild:hover {
      background: #252525;
      transform: translateY(-2px);
    }
    .guild.disconnected { opacity: 0.5; }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #5865F2;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    .info { overflow: hidden; flex: 1; }
    .name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      font-size: 0.75rem;
      color: #666;
      display: flex;
      gap: 0.75rem;
      margin-top: 2px;
    }
    .members {
      color: #43b581;
    }
    .premium {
      background: #faa61a;
      color: #000;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .plugins {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .plugin {
      background: #2d2d2d;
      color: #aaa;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .plugin.enabled {
      background: #1e4620;
      color: #43b581;
    }
    .plugin.disabled {
      background: #4a1c1c;
      color: #ed4245;
    }
  </style>
</head>
<body>
  <h1>Hans Guilds</h1>
  <p class="stats">
    <span>${connectedCount}</span> connected / ${guildsWithMembers.length} in database |
    <span>${totalMembers.toLocaleString()}</span> total members
  </p>
  <div class="grid">
    ${guildsWithMembers
      .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
      .map((g) => {
        const avatarUrl = g.avatar
          ? `https://cdn.discordapp.com/icons/${g.guildId}/${g.avatar}.png?size=96`
          : null
        const initial = g.name?.charAt(0).toUpperCase() || '?'
        const isConnected = g.memberCount !== null

        return `
        <div class="guild ${isConnected ? '' : 'disconnected'}">
          <div class="avatar">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.innerText='${initial}'">` : initial}
          </div>
          <div class="info">
            <div class="name">${escapeHtml(g.name || 'Unknown')}</div>
            <div class="meta">
              <span class="members">${g.memberCount !== null ? g.memberCount.toLocaleString() + ' members' : 'Not connected'}</span>
            </div>
            ${g.plugins.length > 0 ? `
            <div class="plugins">
              ${g.plugins.map((p) => `<span class="plugin ${p.enabled ? 'enabled' : 'disabled'}">${escapeHtml(p.name)}</span>`).join('')}
            </div>
            ` : ''}
          </div>
          ${g.premium ? '<span class="premium">PREMIUM</span>' : ''}
        </div>
        `
      })
      .join('')}
  </div>
</body>
</html>
      `

      return new Response(html, { headers: { 'Content-Type': 'text/html' } })
    }

    return new Response('Not Found', { status: 404 })
  },
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

console.log(`Server running at http://localhost:${server.port}`)
