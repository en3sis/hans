import { differenceInSeconds, endOfDay } from 'date-fns'
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
