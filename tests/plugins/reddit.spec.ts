// Creates a test for the compareTitles function
import { expect } from 'chai'
import { areSameTitle, cleanTitle } from './../../src/controllers/plugins/reddit.controller'

describe('Reddit Controller', () => {
  context('areSameTitle()', () => {
    it('should return true if the titles are the same', () => {
      const title1 = 'test'
      const title2 = 'test'

      const result = areSameTitle(title1, title2)

      expect(result).to.eq(true)
    })

    it('should use the clean functionality and match the titles', () => {
      const title1 = '[foo, bar] test'
      const title2 = 'test'

      const result = areSameTitle(title1, title2)

      expect(result).to.eq(true)
    })

    it('should use the clean functionality and match the titles', () => {
      const title1 = '[foo, bar] (Steam) test'
      const title2 = 'test'

      const result = areSameTitle(title1, title2)

      expect(result).to.eq(true)
    })

    it('should return false if they are not the same and the second title is larger', () => {
      const title1 = 'test'
      const title2 = 'test two'

      const result = areSameTitle(title1, title2)
      expect(result).to.eql(false)
    })

    it('should return false if they are not the same and the second title is larger', () => {
      const title1 = '[xbox, foo] test two'
      const title2 = 'test '

      const result = areSameTitle(title1, title2)
      expect(result).to.eql(false)
    })
  })

  context('cleanTitle()', () => {
    it('should remove the [foo, bar] from the title', () => {
      const title = '[foo, bar] test'
      const result = cleanTitle(title)

      expect(result).to.eql('test')
    })

    it('should remove the [foo, bar] and (Steam) from the title', () => {
      const title = '[foo, bar] (Steam) test'
      const result = cleanTitle(title)

      expect(result).to.eql('test')
    })
  })
})
