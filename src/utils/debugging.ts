import { log } from './log'
/**
 * It will return a formate message based on the environment
 * @param text Console message
 * @param error error object
 */
export const logger = (text: string, error: Error) => {
  log.error(text, !!process.env.ISDEV ? error : error.message)
  throw Error(error.message)
}
