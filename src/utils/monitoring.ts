import { TextChannel } from 'discord.js'
import { Hans } from '..'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reportErrorToMonitoring = async ({ embeds }: { embeds: any }) => {
  try {
    const monitoringChannel = Hans.channels.cache.get(
      Hans.settings?.monitoring_channel_id ?? '',
    ) as TextChannel

    if (!monitoringChannel) return

    await monitoringChannel.send({
      embeds: [embeds],
    })
  } catch (error) {}
}
