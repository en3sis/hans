import { cors } from './middleware/cors'
import { authMiddleware, type AuthenticatedRequest } from './middleware/auth'
import { handleGuildsRoutes } from './routes/guilds'
import { handlePluginsRoutes } from './routes/plugins'
import { handleHealthRoutes } from './routes/health'

const API_PORT = Number(process.env.API_PORT) || 3009

type RouteHandler = (req: AuthenticatedRequest, params: Record<string, string>) => Promise<Response>

type ParamExtractor = (pathname: string) => Record<string, string> | null

interface Route {
  method: string
  match: (pathname: string) => boolean
  extractParams: ParamExtractor
  handler: RouteHandler
  requiresAuth: boolean
}

// Helper to create route matchers without named capture groups
function createRoute(
  method: string,
  pathPattern: string,
  handler: RouteHandler,
  requiresAuth: boolean,
): Route {
  // Convert path pattern like '/api/v1/guilds/:guildId' to regex and param names
  const paramNames: string[] = []
  const regexPattern = pathPattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name)
    return '([^/]+)'
  })
  const regex = new RegExp(`^${regexPattern}$`)

  return {
    method,
    match: (pathname: string) => regex.test(pathname),
    extractParams: (pathname: string) => {
      const match = pathname.match(regex)
      if (!match) return null

      const params: Record<string, string> = {}
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1]
      })
      return params
    },
    handler,
    requiresAuth,
  }
}

const routes: Route[] = [
  // Health check (no auth required)
  createRoute('GET', '/api/v1/health', handleHealthRoutes.health, false),

  // Guild routes (auth required)
  createRoute('GET', '/api/v1/guilds', handleGuildsRoutes.list, true),
  createRoute('GET', '/api/v1/guilds/:guildId', handleGuildsRoutes.get, true),

  // Plugin routes (auth required)
  createRoute('PATCH', '/api/v1/guilds/:guildId/plugins/:pluginName', handlePluginsRoutes.update, true),
]

function matchRoute(
  method: string,
  pathname: string,
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue

    if (route.match(pathname)) {
      const params = route.extractParams(pathname)
      if (params !== null) {
        return { route, params }
      }
    }
  }
  return null
}

export function startApiServer() {
  const server = Bun.serve({
    port: API_PORT,
    async fetch(req: Request) {
      // Handle CORS preflight
      const corsResponse = cors(req)
      if (corsResponse) return corsResponse

      const url = new URL(req.url)
      const { pathname } = url

      // Match route
      const matched = matchRoute(req.method, pathname)

      if (!matched) {
        return new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...cors.headers(),
          },
        })
      }

      const { route, params } = matched

      // Apply auth middleware if required
      let authenticatedReq: AuthenticatedRequest = req as AuthenticatedRequest

      if (route.requiresAuth) {
        const authResult = await authMiddleware(req)
        if (authResult instanceof Response) {
          return authResult
        }
        authenticatedReq = authResult
      }

      try {
        const response = await route.handler(authenticatedReq, params)
        // Add CORS headers to response
        const headers = new Headers(response.headers)
        Object.entries(cors.headers()).forEach(([key, value]) => {
          headers.set(key, value)
        })
        return new Response(response.body, {
          status: response.status,
          headers,
        })
      } catch (error) {
        console.error('API Error:', error)
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...cors.headers(),
          },
        })
      }
    },
  })

  console.log(`🌐 API server running at http://localhost:${server.port}`)
  return server
}
