import axios from 'axios'
import { Client, TextChannel } from 'discord.js'
import floor from 'lodash/floor'
import truncate from 'lodash/truncate'
import words from 'lodash/words'
import { getFromCache, setToCache } from '../../lib/node-cache'
import { RedditModel, TGuildAndChannel, TRedditModel } from '../../models/plugins/reddit.model'
import { base64 } from '../../utils/crypto'
import { sleep } from '../../utils/dates'
import { RedditTitleGroup } from '../../utils/regex'
import { find, insertOne, updateOne } from '../mongodb/mongo-crud'

// exports a function that search a subreddit latest post vía the reddit API
export const fetchSubReddit = async (subreddit: string) => {
  try {
    const { data } = await axios(`https://www.reddit.com/r/${subreddit}/new.json`)

    // TODO: Filter the ones with mod-tag, we only want the games publications
    return data.data?.children[0]
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
          if (!result.data) return
          // Ignore if the post is the same as the one in the database.

          if (result.data?.id === document.latestPostId) return
          if (document?.lastPostTitle && areSameTitle(result.data?.title, document?.lastPostTitle))
            return

          // Iterates over ele.subscribedGuilds and send the message to each guild
          document.subscribedGuilds.map(async (ele: TGuildAndChannel) => {
            try {
              if (!ele.channelId || !ele.id) return

              // Avoid rate limit
              await sleep(500)

              const guild = Hans.guilds.cache.get(ele.id)
              const channel = guild?.channels.cache.get(ele.channelId) as TextChannel

              const fields = result.data?.url
                ? [
                    {
                      name: 'External link 🏷',
                      value: `[To destination](${result.data?.url})`,
                      inline: true,
                    },
                    {
                      name: 'Reddit post 📝',
                      value: `[To Reddit](https://www.reddit.com${result.data?.permalink})`,
                      inline: true,
                    },
                  ]
                : [
                    {
                      name: 'Reddit post 📝',
                      value: `[To Reddit](https://www.reddit.com${result.data?.permalink})`,
                      inline: true,
                    },
                  ]

              await channel.send({
                embeds: [
                  {
                    author: {
                      name: result.data?.author,
                      url: result.data?.url,
                    },
                    title: result.data?.title,
                    description:
                      truncate(result.data?.selftext, { length: 100, omission: '...' }) ||
                      document.description ||
                      `No description was added to the post.`,
                    thumbnail: {
                      url: result.data?.thumbnail.startsWith('https://')
                        ? result.data?.thumbnail
                        : 'https://cdn.discordapp.com/attachments/626034007087513601/1014802216831438879/hans-fff.png',
                    },
                    fields: fields,
                    // timestamp: formatISO(result.data?.created) || formatISO(new Date()),
                    color: 0xff4500,
                    footer: {
                      text: `From /r/${document?.name}`,
                      icon_url: 'https://i.imgur.com/sdO8tAw.png',
                    },
                  },
                ],
              })

              if (process.env.ISDEV)
                console.log(
                  '🟢 INFO: reddit(): ',
                  `${result.data?.title} was sent to the guilds ${ele.channelId}`,
                )
            } catch (error) {
              console.log('❌ ERROR: reddit()-> subscribedGuilds: ', error)
            }
          })

          await updateOne({
            dataBase: 'plugins',
            collection: 'reddit',
            query: { name: document.name },
            data: { $set: { latestPostId: result.data?.id, lastPostTitle: result.data?.title } },
          })

          const encodeTitle = base64(cleanTitle(result.data.title))

          setToCache(encodeTitle, {}, 1440)

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
          lastPostTitle: '',
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

export const areSameTitle = (title1: string, title2: string) => {
  // Check in cache
  const title1Cache = getFromCache(base64(cleanTitle(title1)))
  if (title1Cache) return true
  if (title1 === title2) return true

  // Split the titles into arrays
  const title1Array = words(cleanTitle(title1))
  const title2Array = words(cleanTitle(title2))

  let matches = 0

  for (let i = 0; i < title1Array.length; i++) {
    for (let j = 0; j < title2Array.length; j++) {
      if (title1Array[i] === title2Array[j]) {
        matches++
      }
    }
  }

  const longestArray = title1Array.length > title2Array.length ? title1Array : title2Array
  // Return the number of matches divided by the length of the first array
  const match = floor(matches / longestArray.length, 2) * 100
  return match >= 60
}

// Usually post have 'groups' in the title, this function removes them.
export const cleanTitle = (title: string) => {
  return title
    .replace(RedditTitleGroup, '')
    .replace(/\((.*?)\)/g, '')
    .toLocaleLowerCase()
    .trim()
}
