import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { PromptTemplate } from '@langchain/core/prompts'

export interface RestaurantOption {
    name: string
    cuisine: string
    priceRange: string
    estimatedCostPerPerson: number
    address: string
    description: string
    features: string[]
    rating?: number
    distance?: string
}

export interface RestaurantRecommendation {
    restaurants: RestaurantOption[]
    bestOption: RestaurantOption
    totalEstimatedCost: number
    reasoning: string
}

/**
 * Restaurant Agent - Finds good restaurants near location with price estimates
 */
export class RestaurantAgent {
    private llm: ChatGoogleGenerativeAI

    constructor(private apiKey: string) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
    }

    /**
     * Find suitable restaurants near the outing location
     */
    async findRestaurants(params: {
        location: string
        city: string
        groupSize: number
        cuisine?: string[]
        budget?: 'low' | 'medium' | 'high'
        mealType?: 'breakfast' | 'lunch' | 'dinner'
        dietaryRestrictions?: string[]
    }): Promise<RestaurantRecommendation> {
        const parser = StructuredOutputParser.fromZodSchema(
            z.object({
                restaurants: z.array(
                    z.object({
                        name: z.string(),
                        cuisine: z.string(),
                        priceRange: z.string().describe('$ to $$$$'),
                        estimatedCostPerPerson: z.number().describe('Average cost per person in USD'),
                        address: z.string(),
                        description: z.string(),
                        features: z.array(z.string()).describe('Special features like outdoor seating, reservations, etc.'),
                        rating: z.number().optional(),
                        distance: z.string().optional()
                    })
                ),
                bestOptionIndex: z.number(),
                reasoning: z.string()
            })
        )

        const prompt = PromptTemplate.fromTemplate(`
You are a restaurant recommendation expert. Find the best restaurants for a group outing.

Location: Near {location} in {city}
Group Size: {groupSize} people
Cuisine Preferences: {cuisine}
Budget: {budget}
Meal Type: {mealType}
Dietary Restrictions: {dietary}

Requirements:
- Suggest 3-5 restaurant options near the location
- Must accommodate groups of {groupSize}
- Provide realistic price estimates per person (including tip and tax)
- Consider variety in cuisine types
- Include practical details (reservations needed, group-friendly features)
- Mention distance from main location if possible

{format_instructions}
`)

        const input = await prompt.format({
            location: params.location,
            city: params.city,
            groupSize: params.groupSize.toString(),
            cuisine: params.cuisine?.join(', ') || 'Any cuisine',
            budget: params.budget || 'medium',
            mealType: params.mealType || 'lunch',
            dietary: params.dietaryRestrictions?.join(', ') || 'None',
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
                console.error('❌ Could not parse restaurant response:', content.substring(0, 500))
                throw new Error('Failed to parse restaurant recommendations. Please try again.')
            }
        }

        const bestOption = parsed.restaurants[parsed.bestOptionIndex] || parsed.restaurants[0]

        return {
            restaurants: parsed.restaurants,
            bestOption,
            totalEstimatedCost: bestOption.estimatedCostPerPerson * params.groupSize,
            reasoning: parsed.reasoning
        }
    }

    /**
     * Get detailed information about a restaurant
     */
    async getRestaurantDetails(restaurantName: string, city: string): Promise<string> {
        const prompt = `
Provide detailed information about ${restaurantName} in ${city}:

Include:
1. Ambiance and atmosphere
2. Signature dishes or must-try items
3. Group dining experience (do they handle large groups well?)
4. Reservation requirements
5. Parking and accessibility
6. Price range with examples
7. Best time to visit for groups
8. Any tips for first-time visitors

Keep it practical and helpful.
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }

    /**
     * Create a dining itinerary
     */
    async createDiningItinerary(params: {
        restaurants: RestaurantOption[]
        groupSize: number
        startTime: string
    }): Promise<string> {
        const prompt = `
Create a dining itinerary for a group of ${params.groupSize} people.

Selected Restaurants:
${params.restaurants.map((r, i) => `${i + 1}. ${r.name} - ${r.cuisine} ($${r.estimatedCostPerPerson}/person)`).join('\n')}

Start Time: ${params.startTime}

Provide:
1. Suggested timeline with arrival and departure times
2. Reservation recommendations
3. What to order (value for money suggestions)
4. Tips for smooth group dining
5. Backup options if the restaurant is full

Make it practical and easy to follow.
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }

    /**
     * Calculate total dining costs with breakdown
     */
    calculateDiningCosts(restaurant: RestaurantOption, groupSize: number): {
        perPerson: number
        food: number
        tax: number
        tip: number
        total: number
    } {
        const foodCost = restaurant.estimatedCostPerPerson * 0.75
        const tax = foodCost * 0.08 // 8% tax
        const tip = foodCost * 0.18 // 18% tip
        const perPerson = foodCost + tax + tip

        return {
            perPerson,
            food: foodCost * groupSize,
            tax: tax * groupSize,
            tip: tip * groupSize,
            total: perPerson * groupSize
        }
    }
}
