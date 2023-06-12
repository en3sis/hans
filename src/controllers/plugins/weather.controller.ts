import axios from 'axios'
import { getFromCache, setToCache } from '../../libs/node-cache'

export const weatherController = async (city: string) => {
  try {
    const dataInCache = getFromCache(city)
    if (dataInCache) return dataInCache

    const { data } = await axios.get(
      `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API!}&q=${city}&aqi=no`,
    )

    setToCache(city, data, 60 * 5)

    return data
  } catch (error) {
    console.log('💢 ERROR: weatherController(): ', error)
  }
}
