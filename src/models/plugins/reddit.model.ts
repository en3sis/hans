export const RedditModel = {
  topic: 'javascript',
  description: 'The programming language of the web',
  latestPostId: '',
  subscribedGuilds: [
    {
      id: '123456789',
      channelId: '123456789'
    }
  ]
}

export type TRedditModel = typeof RedditModel
