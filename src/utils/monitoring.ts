import { TextChannel } from 'discord.js'
import { Hans } from '..'

export const reportErrorToMonitoring = async ({ embeds }) => {
  try {
    const monitoringChannel = Hans.channels.cache.get(
      Hans.settings?.monitoring_channel_id,
    ) as TextChannel

    if (!monitoringChannel) return

    await monitoringChannel.send({
      embeds: [embeds],
    })
  } catch (error) {}
}
