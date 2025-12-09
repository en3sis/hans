import axios from 'axios'
import { getFromCache, setToCache } from '../../libs/node-cache'

export const weatherController = async (city: string) => {
  try {
    const dataInCache = getFromCache(`${city}-forecast`)
    if (dataInCache) return dataInCache

    const { data } = await axios.get(
      `https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHER_API!}&q=${city}&days=3&aqi=no&alerts=no`,
    )

    setToCache(`${city}-forecast`, data, 60 * 5)

    return data
  } catch (error) {
    console.log('💢 ERROR: weatherController(): ', error)
  }
}
