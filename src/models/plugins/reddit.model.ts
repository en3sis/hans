export type TGuildAndChannel = {
  id: string
  channelId: string
}

export type TRedditModel = typeof RedditModel

export const RedditModel = {
  name: 'javascript',
  description: 'The programming language of the web',
  latestPostId: '',
  lastPostTitle: '',
  subscribedGuilds: [
    {
      id: '',
      channelId: '',
    },
  ],
}
