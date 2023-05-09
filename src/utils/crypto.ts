import crypto from 'crypto'

export const base64 = (str: string | object | unknown) =>
  typeof str === 'string'
    ? Buffer.from(str).toString('base64')
    : Buffer.from(JSON.stringify(str)).toString('base64')

export const base64Decode = (str: string) => Buffer.from(str, 'base64').toString('utf-8')

const KEY = crypto.createHash('sha256').update(process.env.CRYPTO_KEY, 'ascii').digest()

/** Encrypts a string using AES-256-CBC
 * @param text String to encrypt
 * @returns string
 */
export const encrypt = (text: string) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, process.env.CRYPTO_IV)
  let encrypted = cipher.update(text, 'ascii', 'base64')
  encrypted += cipher.final('base64')

  return encrypted
}

/** Decrypts a string using AES-256-CBC
 * @param text Encrypted string
 * @returns string
 */
export const decrypt = (text: string) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, process.env.CRYPTO_IV)
  let decrypted = decipher.update(text, 'base64', 'ascii')
  decrypted += decipher.final('ascii')

  return decrypted
}
