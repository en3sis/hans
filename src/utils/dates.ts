import { differenceInSeconds, endOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'

export const formatFromNow = (time: number | Date) => formatDistanceToNow(time, { addSuffix: true })

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const getTimeRemainingUntilMidnight = () => {
  const now = new Date()
  const midnight = endOfDay(now)
  const timeRemaining = differenceInSeconds(midnight, now)

  if (timeRemaining >= 3600) {
    const hours = Math.floor(timeRemaining / 3600)
    return `in ${hours} hour${hours > 1 ? 's' : ''}`
  } else if (timeRemaining >= 60) {
    const minutes = Math.floor(timeRemaining / 60)
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`
  } else {
    return `in ${timeRemaining} second${timeRemaining > 1 ? 's' : ''}`
  }
}

export const getTimeZonesTime = (
  targetTimezone: string,
  authorTimezone: string,
): { authorLocalTime: string; targetLocalTime: string } => {
  const now = new Date()

  const localTime = formatInTimeZone(now, authorTimezone, 'yyyy-MM-dd HH:mm:ss')
  const targetLocalTime = formatInTimeZone(now, targetTimezone, 'yyyy-MM-dd HH:mm:ss')

  return { targetLocalTime, authorLocalTime: localTime }
}

export const extractHours = (time: string) => {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
