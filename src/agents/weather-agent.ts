import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

export interface WeatherData {
    date: string
    temperature: {
        min: number
        max: number
        avg: number
    }
    condition: string
    precipitation: number
    humidity: number
    windSpeed: number
    recommendation: string
}

/**
 * Weather Agent - Gets weather forecast for planning dates
 * Uses Open-Meteo API (free, no API key required)
 */
export class WeatherAgent {
    private llm: ChatGoogleGenerativeAI

    constructor(private apiKey: string) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
    }

    /**
     * Get weather forecast for a specific date and location
     */
    async getWeatherForecast(params: {
        city: string
        date: Date
    }): Promise<WeatherData> {
        try {
            // Step 1: Get coordinates for the city
            const coords = await this.getCoordinates(params.city)
            
            // Step 2: Get weather data from Open-Meteo API
            const weatherData = await this.fetchWeatherData(
                coords.latitude,
                coords.longitude,
                params.date
            )

            // Step 3: Use AI to generate recommendation
            const recommendation = await this.generateRecommendation(weatherData)

            return {
                ...weatherData,
                recommendation
            }
        } catch (error) {
            console.error('Error fetching weather:', error)
            // Return default data if API fails
            return this.getDefaultWeather(params.date)
        }
    }

    /**
     * Get coordinates for a city using Open-Meteo Geocoding API
     */
    private async getCoordinates(city: string): Promise<{ latitude: number; longitude: number }> {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        
        const response = await fetch(url)
        const data: any = await response.json()

        if (!data.results || data.results.length === 0) {
            throw new Error(`City not found: ${city}`)
        }

        return {
            latitude: data.results[0].latitude,
            longitude: data.results[0].longitude
        }
    }

    /**
     * Fetch weather data from Open-Meteo API
     */
    private async fetchWeatherData(
        latitude: number,
        longitude: number,
        date: Date
    ): Promise<Omit<WeatherData, 'recommendation'>> {
        const dateStr = date.toISOString().split('T')[0]
        
        // Open-Meteo API - Free, no API key needed
        const url = `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${latitude}&longitude=${longitude}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode` +
            `&start_date=${dateStr}&end_date=${dateStr}` +
            `&timezone=auto`

        const response = await fetch(url)
        const data: any = await response.json()

        if (!data.daily) {
            throw new Error('No weather data available')
        }

        const temp_max = data.daily.temperature_2m_max[0]
        const temp_min = data.daily.temperature_2m_min[0]
        const precipitation = data.daily.precipitation_sum[0]
        const windSpeed = data.daily.windspeed_10m_max[0]
        const weatherCode = data.daily.weathercode[0]

        return {
            date: dateStr,
            temperature: {
                min: Math.round(temp_min),
                max: Math.round(temp_max),
                avg: Math.round((temp_min + temp_max) / 2)
            },
            condition: this.getWeatherCondition(weatherCode),
            precipitation: precipitation || 0,
            humidity: 60, // Open-Meteo doesn't provide humidity in free tier
            windSpeed: Math.round(windSpeed)
        }
    }

    /**
     * Convert WMO weather code to readable condition
     */
    private getWeatherCondition(code: number): string {
        const conditions: { [key: number]: string } = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with hail',
            99: 'Thunderstorm with hail'
        }
        return conditions[code] || 'Unknown'
    }

    /**
     * Generate activity recommendations based on weather
     */
    private async generateRecommendation(weather: Omit<WeatherData, 'recommendation'>): Promise<string> {
        const prompt = `Based on this weather forecast, provide a brief recommendation for outdoor activities:
        
Temperature: ${weather.temperature.min}°C - ${weather.temperature.max}°C
Condition: ${weather.condition}
Precipitation: ${weather.precipitation}mm
Wind Speed: ${weather.windSpeed} km/h

Provide 1-2 sentences with practical advice (e.g., "Perfect weather for outdoor activities" or "Bring an umbrella and consider indoor backup plans").`

        const result = await this.llm.invoke(prompt)
        return result.content.toString().trim()
    }

    /**
     * Return default weather data when API fails
     */
    private getDefaultWeather(date: Date): WeatherData {
        return {
            date: date.toISOString().split('T')[0],
            temperature: { min: 15, max: 22, avg: 18 },
            condition: 'Partly cloudy',
            precipitation: 0,
            humidity: 60,
            windSpeed: 10,
            recommendation: 'Weather data unavailable. Plan for variable conditions and check forecast closer to date.'
        }
    }

    /**
     * Format weather data for display
     */
    formatWeatherReport(weather: WeatherData): string {
        return `🌤️  WEATHER FORECAST

📅 Date: ${weather.date}
🌡️  Temperature: ${weather.temperature.min}°C - ${weather.temperature.max}°C (avg: ${weather.temperature.avg}°C)
☁️  Condition: ${weather.condition}
🌧️  Precipitation: ${weather.precipitation}mm
💨 Wind Speed: ${weather.windSpeed} km/h
💧 Humidity: ~${weather.humidity}%

💡 ${weather.recommendation}`
    }
}
