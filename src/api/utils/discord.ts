import type { DiscordUser } from '../middleware/auth'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

// Discord permission flags
const ADMINISTRATOR = BigInt(0x8)

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

/**
 * Fetch the current user from Discord API using their access token
 */
export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Discord API error:', response.status, await response.text())
      return null
    }

    return (await response.json()) as DiscordUser
  } catch (error) {
    console.error('Failed to fetch Discord user:', error)
    return null
  }
}

/**
 * Fetch all guilds the user is a member of
 */
export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Discord API error fetching guilds:', response.status, await response.text())
      return []
    }

    return (await response.json()) as DiscordGuild[]
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
