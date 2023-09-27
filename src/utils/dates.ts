import { differenceInSeconds, endOfDay } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'

/**
 * Returns a string representing the time difference between the given time and now.
 * @param time - The time to format.
 * @returns A string representing the time difference between the given time and now.
 */
export const formatFromNow = (time: number | Date) => formatDistanceToNow(time, { addSuffix: true })

/**
 * Returns a promise that resolves after the given number of milliseconds.
 * @param ms - The number of milliseconds to sleep.
 * @returns A promise that resolves after the given number of milliseconds.
 */
export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Returns a string representing the time remaining until midnight.
 * @returns A string representing the time remaining until midnight.
 */
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

/**
 * Returns the local time in two different time zones.
 * @param targetTimezone - The target timezone to get the local time for.
 * @param authorTimezone - The author's timezone to get the local time for.
 * @returns An object containing the author's local time and the target timezone's local time.
 */
export const getTimeZonesTime = (
  targetTimezone: string,
  authorTimezone: string,
): { authorLocalTime: string; targetLocalTime: string } => {
  const now = new Date()

  const localTime = formatInTimeZone(now, authorTimezone, 'yyyy-MM-dd HH:mm:ss')
  const targetLocalTime = formatInTimeZone(now, targetTimezone, 'yyyy-MM-dd HH:mm:ss')

  return { targetLocalTime, authorLocalTime: localTime }
}

/**
 * Extracts the hours and minutes from a given time string.
 * @param time - The time string to extract the hours and minutes from.
 * @returns A string representing the hours and minutes in the format "HH:mm".
 */
export const extractHours = (time: string) => {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
