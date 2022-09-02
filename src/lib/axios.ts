import axios from 'axios'

/**
 * Fetch of Github API, requires a token to be passed as an env variable.
 * @param endpoint The endpoint to call
 * @returns
 */
export const githubAPI = async (endpoint: string) => {
  try {
    const { data } = await axios({
      method: 'get',
      url: `https://api.github.com/${endpoint}`,
      headers: {
        Authorization: `token ${process.env.GITHUB_API_TOKEN}`,
      },
    })

    return data
  } catch (error) {
    console.log('❌ ERROR: githubAPI(): ', error)
    if (typeof error === 'string') {
      error
    } else if (error instanceof Error) {
      error.message
    }
  }
}
