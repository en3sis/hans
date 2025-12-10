import { fetchDiscordUser } from '../utils/discord'
import { cors } from './cors'

export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
}

export interface AuthenticatedRequest extends Request {
  user: DiscordUser
  accessToken: string
}

export async function authMiddleware(req: Request): Promise<AuthenticatedRequest | Response> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...cors.headers(),
      },
    })
  }

  const accessToken = authHeader.substring(7)

  try {
    const user = await fetchDiscordUser(accessToken)

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...cors.headers(),
        },
      })
    }

    const authenticatedReq = req as AuthenticatedRequest
    authenticatedReq.user = user
    authenticatedReq.accessToken = accessToken

    return authenticatedReq
  } catch (error) {
    console.error('Auth middleware error:', error)
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...cors.headers(),
      },
    })
  }
}
