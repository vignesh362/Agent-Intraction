import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

export interface FlightOption {
    airline: string
    flightNumber?: string
    departure: string
    arrival: string
    duration: string
    stops: number
    pricePerPerson: number
    departureTime: string
    arrivalTime: string
    bookingUrl?: string
    class: 'economy' | 'premium' | 'business' | 'first'
}

export interface FlightRecommendation {
    options: FlightOption[]
    bestOption: FlightOption
    totalCost: number
    searchUrl: string
}

/**
 * Flight Agent - Searches for flights using public APIs and aggregators
 * Uses Kiwi.com API (free, no auth required) for real flight data
 */
export class FlightAgent {
    private llm: ChatGoogleGenerativeAI

    constructor(private apiKey: string) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
    }

    /**
     * Search for flights using Kiwi.com Tequila API (free tier)
     */
    async searchFlights(params: {
        from: string // City or airport code
        to: string // City or airport code
        date: string // YYYY-MM-DD
        groupSize: number
        budget?: 'low' | 'medium' | 'high'
        returnDate?: string // For round trip
    }): Promise<FlightRecommendation> {
        console.log(`✈️  Searching flights: ${params.from} → ${params.to} on ${params.date}`)

        try {
            // Try Kiwi.com API (no auth needed for basic searches)
            const flights = await this.searchKiwiFlights(params)
            
            if (flights && flights.length > 0) {
                return this.formatFlightResults(flights, params.groupSize)
            }
        } catch (error) {
            console.error('⚠️  Flight API error:', error)
        }

        // Fallback: Use AI to suggest typical flights
        console.log('⚠️  Using AI to suggest typical flight options')
        return this.generateAIFlightSuggestions(params)
    }

    /**
     * Search for flights using Google Flights data
     * Uses Serpapi (free tier available) to scrape Google Flights
     */
    private async searchKiwiFlights(params: {
        from: string
        to: string
        date: string
        returnDate?: string
    }): Promise<any[]> {
        // Try Serpapi if API key is available (free tier: 100 searches/month)
        const serpApiKey = process.env.SERPAPI_KEY
        
        if (serpApiKey) {
            try {
                const url = `https://serpapi.com/search?` +
                    `engine=google_flights&` +
                    `departure_id=${params.from}&` +
                    `arrival_id=${params.to}&` +
                    `outbound_date=${params.date}&` +
                    `currency=USD&` +
                    `hl=en&` +
                    `api_key=${serpApiKey}`

                console.log('✈️  Fetching real flight data from Google Flights...')
                const response = await fetch(url)
                const data = await response.json() as any

                if (data.best_flights || data.other_flights) {
                    const flights = [
                        ...(data.best_flights || []),
                        ...(data.other_flights || []).slice(0, 3)
                    ]
                    console.log(`✅ Found ${flights.length} real flights`)
                    return flights.map((f: any) => ({
                        airline: f.flights?.[0]?.airline || 'Unknown',
                        flightNumber: f.flights?.[0]?.flight_number,
                        departure: params.from,
                        arrival: params.to,
                        duration: `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m`,
                        stops: f.flights?.length - 1 || 0,
                        pricePerPerson: f.price || 0,
                        departureTime: f.flights?.[0]?.departure_airport?.time,
                        arrivalTime: f.flights?.[f.flights.length - 1]?.arrival_airport?.time,
                        class: 'economy'
                    }))
                }
            } catch (error) {
                console.error('⚠️  Serpapi error:', error)
            }
        }
        
        console.log('💡 Using AI-based flight suggestions with real booking links')
        return []
    }

    /**
     * Generate AI-based flight suggestions with realistic prices
     */
    private async generateAIFlightSuggestions(params: {
        from: string
        to: string
        date: string
        groupSize: number
        budget?: 'low' | 'medium' | 'high'
        returnDate?: string
    }): Promise<FlightRecommendation> {
        const prompt = `
You are a flight booking expert. Suggest realistic flight options for a group trip.

From: ${params.from}
To: ${params.to}
Date: ${params.date}
${params.returnDate ? `Return: ${params.returnDate}` : 'One-way'}
Group Size: ${params.groupSize} people
Budget: ${params.budget || 'medium'}

Provide 3-4 realistic flight options with:
- Major airlines that actually fly this route
- Realistic prices based on typical fares
- Typical flight durations
- Direct or 1-stop options
- Different time slots (morning, afternoon, evening)

Consider:
- Distance between cities
- Typical airline pricing
- Time of year and day of week
- Budget constraints

Format as JSON array of flight options with:
{
  "airline": "United Airlines",
  "departure": "SFO",
  "arrival": "JFK",
  "duration": "5h 30m",
  "stops": 0,
  "pricePerPerson": 350,
  "departureTime": "08:00 AM",
  "arrivalTime": "04:30 PM EST",
  "class": "economy"
}
`

        const response = await this.llm.invoke(prompt)
        const content = response.content as string
        
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/)?.[0]
        const flights = jsonMatch ? JSON.parse(jsonMatch) : []

        return this.formatFlightResults(flights, params.groupSize, params)
    }

    /**
     * Format flight results into recommendation
     */
    private formatFlightResults(
        flights: any[],
        groupSize: number,
        params?: any
    ): FlightRecommendation {
        const options: FlightOption[] = flights.map((f: any) => ({
            airline: f.airline || 'Unknown Airline',
            flightNumber: f.flightNumber,
            departure: f.departure || params?.from,
            arrival: f.arrival || params?.to,
            duration: f.duration || 'TBD',
            stops: f.stops || 0,
            pricePerPerson: f.pricePerPerson || 0,
            departureTime: f.departureTime || '09:00 AM',
            arrivalTime: f.arrivalTime || '05:00 PM',
            class: f.class || 'economy',
            bookingUrl: f.bookingUrl
        }))

        // Find cheapest option as best
        const bestOption = options.reduce((min, opt) => 
            opt.pricePerPerson < min.pricePerPerson ? opt : min
        , options[0])

        // Generate search URLs for major booking sites
        const searchUrl = this.generateSearchUrls(params)

        return {
            options,
            bestOption,
            totalCost: bestOption.pricePerPerson * groupSize,
            searchUrl
        }
    }

    /**
     * Generate search URLs for flight booking sites
     */
    private generateSearchUrls(params: any): string {
        const from = params?.from || 'SFO'
        const to = params?.to || 'JFK'
        const date = params?.date || '2025-12-01'
        
        // Google Flights search URL
        const googleFlights = `https://www.google.com/travel/flights?` +
            `q=Flights%20from%20${from}%20to%20${to}%20on%20${date}`
        
        return googleFlights
    }

    /**
     * Format flight recommendations for iMessage
     */
    formatFlightMessage(recommendation: FlightRecommendation): string {
        const best = recommendation.bestOption
        
        let message = `✈️  FLIGHT OPTIONS\n\n`
        message += `🎯 Best Option:\n`
        message += `   ${best.airline}\n`
        message += `   ${best.departure} → ${best.arrival}\n`
        message += `   ${best.departureTime} - ${best.arrivalTime}\n`
        message += `   Duration: ${best.duration}\n`
        message += `   Stops: ${best.stops === 0 ? 'Direct' : `${best.stops} stop(s)`}\n`
        message += `   Price: $${best.pricePerPerson}/person\n\n`

        if (recommendation.options.length > 1) {
            message += `📋 Other Options:\n`
            recommendation.options
                .filter(opt => opt !== best)
                .slice(0, 2)
                .forEach(opt => {
                    message += `   • ${opt.airline} - $${opt.pricePerPerson} (${opt.duration})\n`
                })
            message += `\n`
        }

        message += `💰 Total for Group: $${recommendation.totalCost}\n\n`
        message += `🔗 Search Flights:\n${recommendation.searchUrl}`

        return message
    }
}
