import { TextChannel } from 'discord.js'
import { Hans } from '..'

export const reportErrorToMonitoring = async ({ embeds }) => {
  try {
    const monitoringChannel = Hans.channels.cache.get(
      Hans.settings?.monitoringChannelId,
    ) as TextChannel

    if (!monitoringChannel) return

    await monitoringChannel.send({
      embeds: [embeds],
    })
  } catch (error) {}
}
