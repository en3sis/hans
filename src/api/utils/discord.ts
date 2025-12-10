import type { DiscordUser } from '../middleware/auth'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

// Discord permission flags
const ADMINISTRATOR = BigInt(0x8)

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const userCache = new Map<string, CacheEntry<DiscordUser>>()
const guildsCache = new Map<string, CacheEntry<DiscordGuild[]>>()

// Cache TTL in milliseconds (5 minutes for users, 2 minutes for guilds)
const USER_CACHE_TTL = 5 * 60 * 1000
const GUILDS_CACHE_TTL = 2 * 60 * 1000

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl })
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

/**
 * Sleep utility for rate limit handling
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch with retry and rate limit handling
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Handle rate limiting
      if (response.status === 429) {
        const data = await response.json() as { retry_after?: number }
        const retryAfter = data.retry_after ?? 1
        console.warn(`Discord rate limited. Retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(retryAfter * 1000 + 100) // Add 100ms buffer
        continue
      }

      return response
    } catch (error) {
      lastError = error as Error
      console.error(`Fetch attempt ${attempt + 1} failed:`, error)
      await sleep(1000 * (attempt + 1)) // Exponential backoff
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Fetch the current user from Discord API using their access token
 */
export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  // Check cache first
  const cached = getCached(userCache, accessToken)
  if (cached) return cached

  try {
    const response = await fetchWithRetry(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Discord API error:', response.status, await response.text())
      return null
    }

    const user = (await response.json()) as DiscordUser
    setCache(userCache, accessToken, user, USER_CACHE_TTL)
    return user
  } catch (error) {
    console.error('Failed to fetch Discord user:', error)
    return null
  }
}

/**
 * Fetch all guilds the user is a member of
 */
export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  // Check cache first
  const cached = getCached(guildsCache, accessToken)
  if (cached) return cached

  try {
    const response = await fetchWithRetry(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Discord API error fetching guilds:', response.status, await response.text())
      return []
    }

    const guilds = (await response.json()) as DiscordGuild[]
    setCache(guildsCache, accessToken, guilds, GUILDS_CACHE_TTL)
    return guilds
  } catch (error) {
    console.error('Failed to fetch user guilds:', error)
    return []
  }
}

/**
 * Check if user has Administrator permission in a guild
 */
export function hasAdminPermission(permissions: string): boolean {
  const permBigInt = BigInt(permissions)
  return (permBigInt & ADMINISTRATOR) === ADMINISTRATOR
}

/**
 * Check if user can manage a guild (owner or admin)
 */
export function canManageGuild(guild: DiscordGuild): boolean {
  return guild.owner || hasAdminPermission(guild.permissions)
}

/**
 * Filter guilds to only those the user can manage
 */
export function filterManageableGuilds(guilds: DiscordGuild[]): DiscordGuild[] {
  return guilds.filter(canManageGuild)
}

/**
 * Verify if a user has access to manage a specific guild
 */
export async function verifyGuildAccess(
  accessToken: string,
  guildId: string,
): Promise<{ hasAccess: boolean; guild?: DiscordGuild }> {
  const guilds = await fetchUserGuilds(accessToken)
  const guild = guilds.find((g) => g.id === guildId)

  if (!guild) {
    return { hasAccess: false }
  }

  if (!canManageGuild(guild)) {
    return { hasAccess: false }
  }

  return { hasAccess: true, guild }
}

/**
 * Invalidate cache for a specific access token
 */
export function invalidateCache(accessToken: string): void {
  userCache.delete(accessToken)
  guildsCache.delete(accessToken)
}
