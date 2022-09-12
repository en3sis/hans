import axios from 'axios'
import { Client, TextChannel } from 'discord.js'
import { RedditModel, TGuildAndChannel, TRedditModel } from '../../models/plugins/reddit.model'
import { sleep } from '../../utils/dates'
import { find, insertOne, updateOne } from '../mongodb/mongo-crud'

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
    const documents = (await find({
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
        try {
          const result = await fetchSubReddit(document.name)
          // Ignore if the post is the same as the one in the database.

          if (result.data.id === document.latestPostId) return

          // Iterates over ele.subscribedGuilds and send the message to each guild
          document.subscribedGuilds.map(async (ele: TGuildAndChannel) => {
            try {
              if (!ele.channelId || !ele.id) return

              // Avoid rate limit
              await sleep(500)

              const guild = Hans.guilds.cache.get(ele.id)
              const channel = guild?.channels.cache.get(ele.channelId) as TextChannel

              await channel.send({
                embeds: [
                  {
                    author: {
                      name: result.data.author,
                      url: result.data.url,
                    },
                    title: result.data.title,
                    description:
                      result.data.selftext ||
                      document.description ||
                      `No description was added to the post.`,
                    thumbnail: {
                      url: result.data?.thumbnail.startsWith('https://')
                        ? result.data?.thumbnail
                        : 'https://cdn.discordapp.com/attachments/626034007087513601/1014802216831438879/hans-fff.png',
                    },
                    fields: [
                      {
                        name: 'Offer link 🏷',
                        value: `[To Offer](${result.data.url})`,
                        inline: true,
                      },
                      {
                        name: 'Reddit Link 🔗',
                        value: `[To Reddit](https://www.reddit.com${result.data.permalink})`,
                        inline: true,
                      },
                    ],
                    // timestamp: formatISO(result.data?.created) || formatISO(new Date()),
                    color: 0xff4500,
                    footer: {
                      text: `From /r/${document.name}`,
                      icon_url: 'https://i.imgur.com/sdO8tAw.png',
                    },
                  },
                ],
              })

              if (process.env.ISDEV)
                console.log(
                  '🟢 INFO: reddit(): ',
                  `${result.data.title} was sent to the guilds ${ele.channelId}`,
                )
            } catch (error) {
              console.log('❌ ERROR: reddit()-> subscribedGuilds: ', error)
            }
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
        } catch (error) {
          console.log('❌ ERROR: reddit()-> map: ', error)
        }
      }),
    )

    return data
  } catch (error) {
    console.error('❌ ERROR: redditPluginInit(): ', error.embeds)
  }
}

// Export a new function that checks the mongodb document to see if the guild is subscribed to the subreddit, if not, creates it.
export const subscribeToSubreddit = async (
  subreddit: string,
  guildId: string,
  channelId: string,
) => {
  try {
    const document = (await find({
      dataBase: 'plugins',
      collection: 'reddit',
      query: { name: subreddit },
    })) as unknown as TRedditModel[]

    if (!document.length) {
      await insertOne({
        dataBase: 'plugins',
        collection: 'reddit',
        data: {
          name: subreddit,
          latestPostId: '',
          subscribedGuilds: [{ id: guildId, channelId }],
        },
      })
    } else {
      const guild = document[0].subscribedGuilds.find((ele) => ele.id === guildId)

      if (!guild) {
        await updateOne({
          dataBase: 'plugins',
          collection: 'reddit',
          query: { name: subreddit },
          data: { $push: { subscribedGuilds: { id: guildId, channelId } } },
        })
      }
    }
  } catch (error) {
    console.error('❌ ERROR: subscribeToSubreddit(): ', error)
  }
}

// Export a new function that checks the mongodb document to see if the guild is subscribed to the subreddit, if so, removes it.
export const unsubscribeToSubreddit = async (subreddit: string, guildId: string) => {
  try {
    const document = (await find({
      dataBase: 'plugins',
      collection: 'reddit',
      query: { name: subreddit },
    })) as unknown as TRedditModel[]

    if (!document.length) return

    await updateOne({
      dataBase: 'plugins',
      collection: 'reddit',
      query: { name: subreddit },
      data: { $pull: { subscribedGuilds: { id: guildId } } },
    })
  } catch (error) {
    console.error('❌ ERROR: unsubscribeToSubreddit(): ', error)
  }
}

// Export a function that checks all the subreddit the guild is subscribed to and returns an array with the names.
export const getSubscribedSubreddits = async (guildId: string) => {
  try {
    const documents = (await find({
      dataBase: 'plugins',
      collection: 'reddit',
      query: {},
    })) as unknown as TRedditModel[]

    const result = documents.map((ele) => {
      const guild = ele.subscribedGuilds.find((ele) => ele.id === guildId)

      if (guild) return ele.name
    })

    return result
  } catch (error) {
    console.error('❌ ERROR: getSubscribedSubreddits(): ', error)
  }
}
