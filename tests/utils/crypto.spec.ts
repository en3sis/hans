import { base64, base64Decode, decrypt, encrypt } from './../../src/utils/crypto'

describe('Utils: Crypto', () => {
  describe('base64()', () => {
    it('should encode a string', () => {
      const bytes = base64('904719402044383273')
      expect(bytes).toBe('OTA0NzE5NDAyMDQ0MzgzMjcz')
    })

    it('should encode an object', () => {
      const bytes = base64({ name: 'subreddit' })
      expect(bytes).toBe('eyJuYW1lIjoic3VicmVkZGl0In0=')
    })

    it('should decode a string', () => {
      const bytes = base64Decode('OTA0NzE5NDAyMDQ0MzgzMjcz')
      expect(bytes).toBe('904719402044383273')
    })

    it('should decode an object', () => {
      const bytes = base64Decode('eyJ0ZXN0IjoidGVzdCJ9')
      expect(bytes).toBe('{"test":"test"}')
    })
  })

  describe('Crypto', () => {
    const plaintext = 'Hello_World!'

    it('Encryption and decryption should work correctly', () => {
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })
  })
})
