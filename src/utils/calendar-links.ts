import { GuildScheduledEvent } from 'discord.js'

export const generateCalendarLinks = (event: GuildScheduledEvent, type: 'google' | 'outlook') => {
  const eventChannelLink = generateEventChannelLink(event)
  const formatGoogleDate = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, '')
  const startTime = new Date(event.scheduledStartTimestamp)
  let endTime: Date

  if (event.scheduledEndTimestamp) {
    endTime = new Date(event.scheduledEndTimestamp)
  } else {
    endTime = new Date(startTime.getTime() + 3600000) // Add 1 hour to the start time
  }

  if (type === 'google') {
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.name,
    )}&dates=${formatGoogleDate(startTime)}/${formatGoogleDate(
      endTime,
    )}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(
      eventChannelLink,
    )}`
  } else {
    // Outlook
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${encodeURIComponent(
      startTime.toISOString(),
    )}&enddt=${encodeURIComponent(endTime.toISOString())}&subject=${encodeURIComponent(
      event.name,
    )}&body=${encodeURIComponent(event.description)}&location=${encodeURIComponent(
      eventChannelLink,
    )}&allday=false&uid=${encodeURIComponent(event.id)}`
  }
}

export const generateEventChannelLink = (event: GuildScheduledEvent) => {
  return `https://discord.com/channels/${event.guildId}/${event.channelId}/${event.id}`
}
