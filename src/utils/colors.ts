import { ColorResolvable } from 'discord.js'

export const sentimentUrgencyTable = (score: number): [string, ColorResolvable] => {
  if (score <= -16) {
    return ['ban', 0xbe185d]
  } else if (score <= -10 && score > -14) {
    return ['kick', 0xc2410c]
  } else if (score <= -12 && score > -10) {
    return ['mute', 0xfb923c]
  } else if (score <= -8) {
    return ['warning', 0xfca5a5]
  }
}
