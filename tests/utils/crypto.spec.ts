import { expect } from 'chai'
import { base64, base64Decode, decrypt, encrypt } from './../../src/utils/crypto'

describe('Utils: Crypto', () => {
  context('base64()', () => {
    it('should encode a string', () => {
      const bytes = base64('904719402044383273')
      expect(bytes).to.eql('OTA0NzE5NDAyMDQ0MzgzMjcz')
    })

    it('should encode an object', () => {
      const bytes = base64({ name: 'subreddit' })
      expect(bytes).to.eql('eyJuYW1lIjoic3VicmVkZGl0In0=')
    })

    it('should decode a string', () => {
      const bytes = base64Decode('OTA0NzE5NDAyMDQ0MzgzMjcz')
      expect(bytes).to.eql('904719402044383273')
    })

    it('should decode an object', () => {
      const bytes = base64Decode('eyJ0ZXN0IjoidGVzdCJ9')
      expect(bytes).to.eql('{"test":"test"}')
    })
  })

  context('Crypto', () => {
    const plaintext = 'Hello_World!'

    it('Encryption and decryption should work correctly', () => {
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).eql(plaintext)
    })
  })
})
