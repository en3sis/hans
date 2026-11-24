import { TWITCH_API_URL } from '../utils/constants'
import { getFromCache, setToCache } from './node-cache'
import { log } from '../utils/log'

export type TwitchAccessToken = {
  accessToken: string
  expiresAt: number
}

interface UserNotFound {
  username: string
  message: string
}

interface TwitchUser {
  username: string
  avatar: string
  description: string
}

interface TwitchStream {
  username: string
  title: string
  game: string
  viewers: number
  startedAt: string
  avatar: string
  thumbnail: string
}

type TwitchResponse = TwitchUser | TwitchStream | UserNotFound

const twitchGet = async (url: string, accessToken: string) => {
  const response = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT!,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) throw new Error(`Twitch API ${response.status}: ${response.statusText}`)
  return response.json()
}

export const getAccessToken = async (): Promise<TwitchAccessToken> => {
  try {
    const params = new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT!,
      client_secret: process.env.TWITCH_SECRET!,
      grant_type: 'client_credentials',
    })
    const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' })
    if (!response.ok) throw new Error(`Twitch token ${response.status}: ${response.statusText}`)
    const data = (await response.json()) as { access_token: string; expires_in: number }

    const expirationTimestamp = Date.now() + data.expires_in * 1000
    const token = { accessToken: data.access_token, expiresAt: expirationTimestamp }
    setToCache('twitchAccessToken', token)
    return token
  } catch (error) {
    log.info('💢 ERROR: getAccessToken(): ', error)
    throw error
  }
}

export const isTokenExpired = () => {
  const cached = getFromCache('twitchAccessToken') as TwitchAccessToken | undefined
  if (!cached?.expiresAt) return true
  return Date.now() >= cached.expiresAt
}

export const getStreamerInfo = async (username: string): Promise<TwitchResponse> => {
  try {
    let accessTokenData = getFromCache('twitchAccessToken') as TwitchAccessToken | undefined

    if (!accessTokenData || isTokenExpired()) {
      accessTokenData = await getAccessToken()
    }

    const userData = await twitchGet(
      `${TWITCH_API_URL}/users?login=${encodeURIComponent(username)}`,
      accessTokenData.accessToken,
    )

    if (userData.data.length === 0) {
      return { username, message: 'User not found.' }
    }

    const user = userData.data[0]
    const streamData = await twitchGet(
      `${TWITCH_API_URL}/streams?user_id=${user.id}`,
      accessTokenData.accessToken,
    )

    if (streamData.data.length === 0) {
      return {
        username,
        avatar: user.profile_image_url,
        description: user.description,
      }
    }

    const stream = streamData.data[0]
    return {
      username,
      title: stream.title,
      game: stream.game_name,
      viewers: stream.viewer_count,
      startedAt: stream.started_at,
      avatar: user.profile_image_url,
      thumbnail: stream.thumbnail_url,
    }
  } catch (error) {
    log.info('💢 ERROR: getStreamerInfo(): ', error)
    throw error
  }
}
