import { SlashCommandBuilder } from '@discordjs/builders'
import { format, parseISO } from 'date-fns'
import { ChatInputCommandInteraction } from 'discord.js'
import { weatherController } from '../controllers/plugins/weather.controller'
import { logger } from '../utils/debugging'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Displays weather information from a location')
    .addStringOption((string) =>
      string.setName('city').setDescription('City name').setRequired(true),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const { location, current, forecast } = await weatherController(
        interaction.options.get('city')!.value as string,
      )

      if (!location || !current || !forecast)
        return await interaction.editReply('Something went wrong, please try again later.')

      // Add a small separation before forecast fields
      const separatorField = {
        name: '\u200B',
        value: 'Forecast',
        inline: false,
      }

      // Prepare forecast fields as main fields structure
      const forecastFields = forecast.forecastday.slice(1, 3).map((day) => ({
        name: `${format(parseISO(day.date), 'EEEE')}`,
        value: `🌡️ ${Math.round(day.day.mintemp_c)}°/${Math.round(day.day.maxtemp_c)}°C\n🌧️ ${day.day.totalprecip_mm}mm\n☀️ ${day.day.uv}`,
        inline: true,
      }))

      // Main weather fields
      const mainFields = [
        {
          name: ' 🌡 Temp:',
          value: `**${Math.floor(current.temp_c)} °C**`,
          inline: true,
        },
        {
          name: '🤷🏻‍♂️  Feels:',
          value: `**${Math.floor(current.feelslike_c)} °C**`,
          inline: true,
        },
        {
          name: '🌧  Precip:',
          value: `**${Math.floor(current.precip_mm)} mm**`,
          inline: true,
        },
        {
          name: '☁️  Cloudcover:',
          value: `${current.cloud} %`,
          inline: true,
        },
        {
          name: '👀  Visibility:',
          value: `${current.vis_km} KM`,
          inline: true,
        },
        {
          name: '🕐  Local time:',
          value: `${location.localtime}`,
          inline: true,
        },
      ]

      // Discord embed field limit is 25, so split if needed
      const allFields = [...mainFields, separatorField, ...forecastFields]
      const fitsInOneEmbed = allFields.length <= 25

      const embeds = [
        {
          title: `Weather in ${location.name}, ${location.country} `,
          description: `${current.condition.text} with **${current.humidity}%** humidity and **${current.wind_kph} km/h** winds and UV index of **${current.uv}** `,
          fields: fitsInOneEmbed ? allFields : mainFields,
          footer: {
            text: `For NA: Temp: ${current.temp_f} F | Feels: ${current.feelslike_f} F  |  🕑 Last update at ${current.last_updated}`,
          },
          thumbnail: {
            url: `https:${current.condition.icon}`,
          },
          color: 0x3f51b5,
        },
      ]

      if (!fitsInOneEmbed) {
        embeds.push({
          title: '3-Day Forecast',
          description: '',
          fields: forecastFields,
          footer: {
            text: `For NA: Temp: ${current.temp_f} F | Feels: ${current.feelslike_f} F  |  🕑 Last update at ${current.last_updated}`,
          },
          thumbnail: {
            url: `https:${current.condition.icon}`,
          },
          color: 0x3f51b5,
        })
      }

      await interaction.editReply({ embeds })
    } catch (error) {
      logger('❌ Command: weather: ', error)
    }
  },
}
