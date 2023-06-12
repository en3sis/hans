import axios from 'axios'
import { TWITCH_API_URL } from '../utils/constants'
import { getFromCache, setToCache } from './node-cache'

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

export const getAccessToken = async (): Promise<TwitchAccessToken> => {
  try {
    const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
      params: {
        client_id: process.env.TWITCH_CLIENT,
        client_secret: process.env.TWITCH_SECRET,
        grant_type: 'client_credentials',
      },
    })

    const expiresIn = tokenResponse.data.expires_in
    const expirationTimestamp = Date.now() + expiresIn * 1000

    setToCache('twitchAccessToken', {
      accessToken: tokenResponse.data.access_token,
      expiresAt: expirationTimestamp,
    })

    return {
      accessToken: tokenResponse.data.access_token,
      expiresAt: expirationTimestamp,
    }
  } catch (error) {
    console.log('💢 ERROR: weatherController(): ', error)
    throw error
  }
}

export const isTokenExpired = () => {
  const { expiresAt } = getFromCache('twitchAccessToken') as TwitchAccessToken

  if (!expiresAt) {
    return true
  }

  const currentTime = Date.now()
  return currentTime >= expiresAt
}

export const getStreamerInfo = async (username: string): Promise<TwitchResponse> => {
  try {
    let accessTokenData = getFromCache('twitchAccessToken') as TwitchAccessToken

    if (!accessTokenData || isTokenExpired()) {
      const res = await getAccessToken()

      setToCache('twitchAccessToken', res)

      accessTokenData = res
    }

    const response = await axios.get(`${TWITCH_API_URL}/users`, {
      params: { login: username },
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT,
        Authorization: `Bearer ${accessTokenData.accessToken}`,
      },
    })

    if (response.data.data.length === 0) {
      return {
        username,
        message: 'User not found.',
      }
    }

    const userId = response.data.data[0].id

    const streamResponse = await axios.get(`${TWITCH_API_URL}/streams`, {
      params: { user_id: userId },
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT,
        Authorization: `Bearer ${accessTokenData.accessToken}`,
      },
    })

    if (streamResponse.data.data.length === 0) {
      return {
        username,
        avatar: response.data.data[0].profile_image_url,
        description: response.data.data[0].description,
      }
    }

    return {
      username,
      title: streamResponse.data.data[0].title,
      game: streamResponse.data.data[0].game_name,
      viewers: streamResponse.data.data[0].viewer_count,
      startedAt: streamResponse.data.data[0].started_at,
      avatar: response.data.data[0].profile_image_url,
      thumbnail: streamResponse.data.data[0].thumbnail_url,
    }
  } catch (error) {
    console.log('💢 ERROR: getStreamerInfo(): ', error)
    throw error
  }
}
