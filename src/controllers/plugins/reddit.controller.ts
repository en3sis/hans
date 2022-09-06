import axios from 'axios'

// exports a function that search a subreddit latest post vía the reddit API
export const fetchSubReddit = async (subreddit: string) => {
  try {
    const { data } = await axios(`https://www.reddit.com/r/${subreddit}/new.json?`)
    return data.data[0]
  } catch (error) {
    console.error('❌ ERROR: reddit(): ', error)
  }
}
