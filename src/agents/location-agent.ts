import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { PromptTemplate } from '@langchain/core/prompts'

export interface LocationOption {
    name: string
    type: string
    description: string
    address: string
    estimatedCostPerPerson: number
    activities: string[]
    rating?: number
    distance?: string
}

export interface LocationRecommendation {
    locations: LocationOption[]
    bestOption: LocationOption
    totalEstimatedCost: number
    reasoning: string
}

/**
 * Location Agent - Finds suitable outing locations with cost estimates
 */
export class LocationAgent {
    private llm: ChatGoogleGenerativeAI

    constructor(private apiKey: string) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
    }

    /**
     * Find suitable locations for group outing
     */
    async findLocations(params: {
        city: string
        groupSize: number
        preferences?: string[]
        budget?: 'low' | 'medium' | 'high'
        date?: string
        duration?: number
    }): Promise<LocationRecommendation> {
        const parser = StructuredOutputParser.fromZodSchema(
            z.object({
                locations: z.array(
                    z.object({
                        name: z.string(),
                        type: z.string().describe('Type of location (e.g., park, museum, beach, etc.)'),
                        description: z.string(),
                        address: z.string(),
                        estimatedCostPerPerson: z.number().describe('Estimated cost per person in USD'),
                        activities: z.array(z.string()).describe('Available activities'),
                        rating: z.number().optional().describe('Rating out of 5'),
                        distance: z.string().optional()
                    })
                ),
                bestOptionIndex: z.number().describe('Index of the best recommended option'),
                reasoning: z.string().describe('Why these locations are recommended')
            })
        )

        const prompt = PromptTemplate.fromTemplate(`
You are a travel and location expert. Find the best outing locations for a group.

City: {city}
Group Size: {groupSize} people
Preferences: {preferences}
Budget Level: {budget}
Date: {date}
Duration: {duration} hours

Requirements:
- Suggest 3-5 different location options
- Include various types (outdoor, indoor, cultural, recreational)
- Provide realistic cost estimates per person (entrance fees, parking, etc.)
- Consider group-friendly activities
- Include practical details like address and what to do there

{format_instructions}
`)

        const input = await prompt.format({
            city: params.city,
            groupSize: params.groupSize.toString(),
            preferences: params.preferences?.join(', ') || 'No specific preferences',
            budget: params.budget || 'medium',
            date: params.date || 'Weekend',
            duration: (params.duration || 4).toString(),
            format_instructions: parser.getFormatInstructions()
        })

        const response = await this.llm.invoke(input)
        
        // Clean up the response - remove markdown code blocks and fix common JSON errors
        let content = response.content as string
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        
        // Try to parse, if it fails, attempt to fix common issues
        let parsed
        try {
            parsed = await parser.parse(content)
        } catch (error) {
            console.log('⚠️  JSON parse error, attempting to fix...')
            // Common fix: remove trailing text after closing brace
            const lastBrace = content.lastIndexOf('}')
            if (lastBrace > 0) {
                content = content.substring(0, lastBrace + 1)
            }
            // Try parsing again
            try {
                parsed = JSON.parse(content)
            } catch (retryError) {
                console.error('❌ Could not parse location response:', content.substring(0, 500))
                throw new Error('Failed to parse location recommendations. Please try again.')
            }
        }

        const bestOption = parsed.locations[parsed.bestOptionIndex] || parsed.locations[0]

        return {
            locations: parsed.locations,
            bestOption,
            totalEstimatedCost: bestOption.estimatedCostPerPerson * params.groupSize,
            reasoning: parsed.reasoning
        }
    }

    /**
     * Get detailed information about a specific location
     */
    async getLocationDetails(locationName: string, city: string): Promise<string> {
        const prompt = `
Provide detailed information about ${locationName} in ${city}:

Include:
1. What makes it special for group outings
2. Best time to visit
3. What to bring/wear
4. Accessibility information
5. Nearby amenities (parking, restrooms, food options)
6. Any tips or insider knowledge

Keep it practical and concise.
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }

    /**
     * Compare multiple locations
     */
    async compareLocations(locations: LocationOption[]): Promise<string> {
        const prompt = `
Compare these location options for a group outing:

${locations.map((loc, i) => `
${i + 1}. ${loc.name} (${loc.type})
   - Cost per person: $${loc.estimatedCostPerPerson}
   - Activities: ${loc.activities.join(', ')}
   - ${loc.description}
`).join('\n')}

Provide:
1. A comparison table highlighting pros/cons
2. Best choice for different priorities (budget, activities, accessibility)
3. Your overall recommendation
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }
}
