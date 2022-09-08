import axios from 'axios'
import { Client, TextChannel } from 'discord.js'
import { RedditModel, TGuildAndChannel, TRedditModel } from '../../models/plugins/reddit.model'
import { sleep } from '../../utils/dates'
import { findMany, insertOne, updateOne } from '../mongodb/mongo-crud'

// exports a function that search a subreddit latest post vía the reddit API
export const fetchSubReddit = async (subreddit: string) => {
  try {
    const { data } = await axios(`https://www.reddit.com/r/${subreddit}/new.json`)

    // TODO: Filter the ones with mod-tag, we only want the games publications
    return data.data.children[0]
  } catch (error) {
    console.error('❌ ERROR: reddit(): ', error)
  }
}

export const redditPluginInit = async (Hans: Client) => {
  try {
    const documents = (await findMany({
      dataBase: 'plugins',
      collection: 'reddit',
      query: {},
    })) as unknown as TRedditModel[]

    // Adds the template for the functionality
    if (!documents.length) {
      await insertOne({
        dataBase: 'plugins',
        collection: 'reddit',
        data: RedditModel,
      })
    }

    // For each subreddit, fetch the latest post and compare it with the one in the database.
    const data = await Promise.all(
      documents.map(async (document: TRedditModel, i) => {
        const result = await fetchSubReddit(document.name)
        // Ignore if the post is the same as the one in the database.

        // Iterates over ele.subscribedGuilds and send the message to each guild
        document.subscribedGuilds.map(async (ele: TGuildAndChannel) => {
          if (!ele.channelId || !!ele.id) return

          // Avoid rate limit
          await sleep(500)

          const guild = Hans.guilds.cache.get(ele.id)
          const channel = guild?.channels.cache.get(ele.channelId) as TextChannel

          channel.send({
            embeds: [
              {
                author: {
                  name: result.data.author,
                  url: result.data.url,
                },
                title: result.data.title,
                description: result.data.selftext || `No description was added to the post.`,
                thumbnail: {
                  url: result.data.thumbnail,
                },
                fields: [
                  {
                    name: 'Reddit Link 🔗',
                    value: `[To Reddit](https://www.reddit.com${result.data.permalink})`,
                  },
                ],
                timestamp: result.data.created_utc,
                color: 0xff9800
              },
            ],
          })
        })

        // If the post is different, update the database with the new post.
        if (result?.data.id !== null) {
          await updateOne({
            dataBase: 'plugins',
            collection: 'reddit',
            query: { name: document.name },
            data: { $set: { latestPostId: result.data.id } },
          })
        }

        // Avoid rate limit
        await sleep(2000 * i + 1)

        return result
      })
    )

    return data
  } catch (error) {
    console.error('❌ ERROR: redditPluginInit(): ', error)
  }
}
