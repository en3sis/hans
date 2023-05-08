import axios from 'axios'
import { getFromCache, setToCache } from '../../libs/node-cache'
// TODO: Add ask for key || Cache City for ~5 Minutes
export const WeatherController = async (city: string) => {
  try {
    const dataInCache = getFromCache(city)
    if (dataInCache) return dataInCache

    const { data } = await axios.get(
      `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API!}&q=${city}&aqi=no`,
    )

    setToCache(city, data, 60 * 5)
    return data
  } catch (error) {
    console.log('WeatherController: ', error)
  }
}
