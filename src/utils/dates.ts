import formatDistanceToNow from 'date-fns/formatDistanceToNow'

export const formatFromNow = (time: number | Date) => formatDistanceToNow(time, { addSuffix: true })

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
