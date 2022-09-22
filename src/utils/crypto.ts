import crypto from 'crypto'

/**
 * Turns a string into a hash using the SHA256 algorithm.
 * @param str string to be encrypted
 */
export const hash = (str: string) => {
  return crypto.createHmac('sha256', process.env.CRYPTO_KEY).update(str).digest('hex')
}

export const base64 = (str: string | object | unknown) =>
  typeof str === 'string'
    ? Buffer.from(str).toString('base64')
    : Buffer.from(JSON.stringify(str)).toString('base64')

export const base64Decode = (str: string) => Buffer.from(str, 'base64').toString('utf-8')
