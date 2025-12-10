import type { AuthenticatedRequest } from '../middleware/auth'

export const handleHealthRoutes = {
  async health(_req: AuthenticatedRequest, _params: Record<string, string>): Promise<Response> {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  },
}
