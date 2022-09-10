import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'
import { WeatherController } from '../controllers/commands/weather.controller'

// https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=replied
module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Displays weather information from a location')
    .addStringOption((string) =>
      string.setName('city').setDescription('City name').setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    const { location, current } = await WeatherController(
      interaction.options.get('city')!.value as string
    )

    await interaction.reply({
      embeds: [
        {
          title: `Weather in ${location.name}, ${location.country} `,
          description: `${current.condition.text} with **${current.humidity}%** humidity and **${current.wind_kph} km/h** winds and UV index of **${current.uv}** `,
          fields: [
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
          ],
          footer: {
            text: `For NA: Temp: ${current.temp_f} F | Feels: ${current.feelslike_f} F  |  🕑 Last update at ${current.last_updated}`,
          },
          thumbnail: {
            url: `https:${current.condition.icon}`,
          },
          color: 0x3f51b5,
        },
      ],
    })
  },
}
