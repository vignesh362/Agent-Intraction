import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { PromptTemplate } from '@langchain/core/prompts'

export interface TransportOption {
    method: string
    provider?: string
    estimatedCostPerPerson: number
    duration: string
    description: string
    capacity: number
    features: string[]
    pros: string[]
    cons: string[]
}

export interface TransportRecommendation {
    options: TransportOption[]
    bestOption: TransportOption
    totalEstimatedCost: number
    reasoning: string
}

/**
 * Transportation Agent - Finds transportation options with cost estimates
 * Uses Serpapi (Google Maps data) for real distance/duration data
 */
export class TransportationAgent {
    private llm: ChatGoogleGenerativeAI
    private mapsApiKey?: string

    constructor(private apiKey: string, serpApiKey?: string) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
        this.mapsApiKey = serpApiKey // Using Serpapi for maps data
    }

    /**
     * Get real distance and duration using Serpapi (Google Maps data)
     */
    private async getGoogleMapsData(from: string, to: string): Promise<{
        distance: string
        duration: string
        distanceMeters: number
        durationSeconds: number
    } | null> {
        if (!this.mapsApiKey) {
            return null
        }

        try {
            // Use Serpapi to get Google Maps directions data
            const url = `https://serpapi.com/search?` +
                `engine=google_maps_directions&` +
                `start_addr=${encodeURIComponent(from)}&` +
                `end_addr=${encodeURIComponent(to)}&` +
                `api_key=${this.mapsApiKey}`

            console.log('🗺️  Fetching route data via Serpapi...')
            const response = await fetch(url)
            const data = await response.json() as any

            if (data.directions && data.directions.length > 0) {
                const direction = data.directions[0]
                const distance = direction.distance
                const duration = direction.duration
                
                console.log(`✅ Serpapi: ${distance}, ${duration}`)
                
                // Parse distance and duration to get numeric values
                const distanceMeters = this.parseDistance(distance)
                const durationSeconds = this.parseDuration(duration)
                
                return {
                    distance,
                    duration,
                    distanceMeters,
                    durationSeconds
                }
            }
            return null
        } catch (error) {
            console.error('⚠️  Serpapi error:', error)
            return null
        }
    }

    /**
     * Parse distance string to meters (e.g., "12.5 mi" -> 20116)
     */
    private parseDistance(distance: string): number {
        const match = distance.match(/([\d.]+)\s*(mi|km|miles|kilometers)/i)
        if (match) {
            const value = parseFloat(match[1])
            const unit = match[2].toLowerCase()
            if (unit.startsWith('mi')) {
                return Math.round(value * 1609.34) // miles to meters
            } else {
                return Math.round(value * 1000) // km to meters
            }
        }
        return 0
    }

    /**
     * Parse duration string to seconds (e.g., "25 min" -> 1500)
     */
    private parseDuration(duration: string): number {
        let totalSeconds = 0
        const hourMatch = duration.match(/(\d+)\s*h/)
        const minMatch = duration.match(/(\d+)\s*min/)
        
        if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600
        if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60
        
        return totalSeconds
    }

    /**
     * Find transportation options for the group
     */
    async findTransportation(params: {
        from: string
        to: string
        city: string
        groupSize: number
        date?: string
        preferences?: string[]
        budget?: 'low' | 'medium' | 'high'
    }): Promise<TransportRecommendation> {
        // Get real distance/duration from Google Maps if available
        const mapsData = await this.getGoogleMapsData(params.from, params.to)
        const realDistance = mapsData ? `${mapsData.distance} (${mapsData.duration})` : 'estimate based on typical city distances'
        
        const parser = StructuredOutputParser.fromZodSchema(
            z.object({
                options: z.array(
                    z.object({
                        method: z.string().describe('Type of transportation'),
                        provider: z.string().optional(),
                        estimatedCostPerPerson: z.number().describe('Cost per person in USD'),
                        duration: z.string(),
                        description: z.string(),
                        capacity: z.number().describe('How many people it can accommodate'),
                        features: z.array(z.string()),
                        pros: z.array(z.string()),
                        cons: z.array(z.string())
                    })
                ),
                bestOptionIndex: z.number(),
                reasoning: z.string()
            })
        )

        const prompt = PromptTemplate.fromTemplate(`
You are a transportation planning expert. Find the best transportation options for a group outing.

From: {from}
To: {to} in {city}
Group Size: {groupSize} people
Real Distance/Duration: {realDistance}
Date: {date}
Preferences: {preferences}
Budget: {budget}

Requirements:
- Suggest 3-5 transportation options (rideshare, rental, public transit, etc.)
- Calculate realistic per-person costs including:
  * Base fare/rental
  * Gas/fuel if applicable
  * Parking fees
  * Tolls if applicable
- Consider group size and coordination
- Include pros and cons for each option
- Factor in convenience, comfort, and cost

Transportation types to consider:
- Rideshare (Uber/Lyft XL or multiple cars)
- Car rental
- Public transportation
- Private shuttle/van rental
- Carpooling with personal vehicles

{format_instructions}
`)

        const input = await prompt.format({
            from: params.from,
            to: params.to,
            city: params.city,
            groupSize: params.groupSize.toString(),
            realDistance: realDistance,
            date: params.date || 'Weekend',
            preferences: params.preferences?.join(', ') || 'No specific preferences',
            budget: params.budget || 'medium',
            format_instructions: parser.getFormatInstructions()
        })

        const response = await this.llm.invoke(input)
        const parsed = await parser.parse(response.content as string)

        const bestOption = parsed.options[parsed.bestOptionIndex] || parsed.options[0]

        return {
            options: parsed.options,
            bestOption,
            totalEstimatedCost: bestOption.estimatedCostPerPerson * params.groupSize,
            reasoning: parsed.reasoning
        }
    }

    /**
     * Get detailed logistics for chosen transportation
     */
    async getTransportLogistics(
        transport: TransportOption,
        groupSize: number,
        startTime: string
    ): Promise<string> {
        const prompt = `
Create detailed transportation logistics for a group of ${groupSize} using ${transport.method}.

Cost per person: $${transport.estimatedCostPerPerson}
Duration: ${transport.duration}
Start Time: ${startTime}

Provide:
1. Step-by-step instructions for coordinating the group
2. When to book/reserve
3. Meeting point and time recommendations
4. What to communicate to the group beforehand
5. Backup plans if something goes wrong
6. Cost breakdown (base fare, additional fees, tips)
7. Payment coordination suggestions

Make it actionable and easy to execute.
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }

    /**
     * Compare transportation options
     */
    async compareOptions(options: TransportOption[], groupSize: number): Promise<string> {
        const prompt = `
Compare these transportation options for ${groupSize} people:

${options.map((opt, i) => `
${i + 1}. ${opt.method}${opt.provider ? ` (${opt.provider})` : ''}
   - Cost per person: $${opt.estimatedCostPerPerson}
   - Duration: ${opt.duration}
   - Capacity: ${opt.capacity} people
   - Pros: ${opt.pros.join(', ')}
   - Cons: ${opt.cons.join(', ')}
`).join('\n')}

Provide:
1. Side-by-side comparison highlighting key differences
2. Best choice for different priorities (cost, convenience, comfort)
3. Overall recommendation with reasoning
4. Tips for group coordination

Be practical and consider real-world factors.
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }

    /**
     * Calculate detailed transportation costs
     */
    calculateTransportCosts(transport: TransportOption, groupSize: number): {
        perPerson: number
        baseCost: number
        additionalFees: number
        total: number
        breakdown: string[]
    } {
        const baseCost = transport.estimatedCostPerPerson * groupSize * 0.7
        const fees = transport.estimatedCostPerPerson * groupSize * 0.2
        const buffer = transport.estimatedCostPerPerson * groupSize * 0.1

        return {
            perPerson: transport.estimatedCostPerPerson,
            baseCost,
            additionalFees: fees + buffer,
            total: transport.estimatedCostPerPerson * groupSize,
            breakdown: [
                `Base fare: $${baseCost.toFixed(2)}`,
                `Fees & extras: $${fees.toFixed(2)}`,
                `Buffer/tips: $${buffer.toFixed(2)}`,
                `Total: $${(baseCost + fees + buffer).toFixed(2)}`
            ]
        }
    }
}
