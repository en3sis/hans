import { TIMEZONES_LIST } from './../../src/data/timezones'
import { TIME_ZONES_REGEX } from './../../src/utils/regex'

const validTimeZones = [
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Africa/Cairo',
  'America/Los_Angeles',
  'Europe/Paris',
  'Pacific/Auckland',
]

const invalidTimeZones = [
  'New_York/America',
  'London/Europe',
  'Tokyo/Asia',
  'Sydney/Australia',
  'Asia/Invalid_Timezone',
  'Invalid_Timezone/Asia1',
  'Invalid_Timezone/Invalid_Timezone22',
]

describe('Utils: Timezone', () => {
  it('should match valid time zones', () => {
    validTimeZones.forEach((timeZone) => {
      expect(TIME_ZONES_REGEX.test(timeZone) && TIMEZONES_LIST.includes(timeZone)).toBe(true)
    })
  })

  it('should not match invalid time zones', () => {
    invalidTimeZones.forEach((timeZone) => {
      expect(TIME_ZONES_REGEX.test(timeZone) && TIMEZONES_LIST.includes(timeZone)).toBe(false)
    })
  })
})
