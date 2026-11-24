import { getFromCache, setToCache } from '../../libs/node-cache'
import { log } from '../../utils/log'

export const weatherController = async (city: string) => {
  try {
    const dataInCache = getFromCache(city)
    if (dataInCache) return dataInCache

    const url = `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API!}&q=${encodeURIComponent(city)}&aqi=no`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`WeatherAPI ${response.status}: ${response.statusText}`)
    const data = await response.json()

    setToCache(city, data, 60 * 5)
    return data
  } catch (error) {
    log.info('💢 ERROR: weatherController(): ', error)
  }
}
