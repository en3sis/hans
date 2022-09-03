import crypto from 'crypto'

/**
 * Turns a string into a hash using the SHA256 algorithm.
 * @param str string to be encrypted
 */
export const hash = (str: string) => {
  return crypto.createHmac('sha256', process.env.CRYPTO_KEY).update(str).digest('hex')
}
