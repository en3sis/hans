import { getStreamerInfo } from '../../libs/twitch'
import { DEFAULT_COLOR } from '../../utils/colors'

export const twitchController = async (username: string) => {
  const streamerInfo = await getStreamerInfo(username)

  if ('message' in streamerInfo) {
    return {
      embeds: [
        {
          color: DEFAULT_COLOR,
          title: streamerInfo.username,
          description: streamerInfo.message,
        },
      ],
    }
  }

  if ('startedAt' in streamerInfo) {
    return {
      embeds: [
        {
          color: DEFAULT_COLOR,
          author: {
            name: streamerInfo.username,
            url: `https://twitch.tv/${streamerInfo.username}`,
            icon_url: streamerInfo.avatar,
          },
          thumbnail: {
            url: streamerInfo.avatar,
          },
          description: `${streamerInfo.title} \n`,
          fields: [
            {
              name: '👾 Current Game',
              value: streamerInfo.game,
            },
            {
              name: '🔴 Live Status',
              value: 'Live',
              inline: true,
            },
            {
              name: '👥 Viewers',
              value: streamerInfo.viewers.toLocaleString(),
              inline: true,
            },
          ],
        },
      ],
    }
  } else {
    return {
      embeds: [
        {
          color: DEFAULT_COLOR,
          title: streamerInfo.username,
          description: streamerInfo.description,
          url: `https://twitch.tv/${streamerInfo.username}`,
          thumbnail: {
            url: streamerInfo.avatar,
          },
          fields: [
            {
              name: '🔴 Live Status',
              value: 'Offline',
              inline: true,
            },
          ],
        },
      ],
    }
  }
}
