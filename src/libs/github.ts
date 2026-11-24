export const githubAPI = async (endpoint: string, auth = false) => {
  try {
    const headers: Record<string, string> = {}
    if (auth) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`

    const response = await fetch(`https://api.github.com/${endpoint}`, { headers })
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`)

    return await response.json()
  } catch (error) {
    console.log('❌ ERROR: githubAPI(): ', error)
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
  }
}
