import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { CalendarAgent, FreeTimeResult } from './calendar-agent.js'
import { LocationAgent, LocationRecommendation } from './location-agent.js'
import { RestaurantAgent, RestaurantRecommendation } from './restaurant-agent.js'
import { TransportationAgent, TransportRecommendation } from './transportation-agent.js'

export interface HolidayPlan {
    timeSlot: FreeTimeResult
    location: LocationRecommendation
    restaurant: RestaurantRecommendation
    transportation: TransportRecommendation
    costBreakdown: CostBreakdown
    summary: string
}

export interface CostBreakdown {
    location: number
    restaurant: number
    transportation: number
    totalPerPerson: number
    totalForGroup: number
    breakdown: {
        category: string
        perPerson: number
        total: number
    }[]
}

export interface PlanningParams {
    city: string
    participants: string[]
    startDate: Date
    endDate: Date
    preferences?: {
        activities?: string[]
        cuisine?: string[]
        budget?: 'low' | 'medium' | 'high'
    }
    duration?: number
    startLocation?: string
}

/**
 * Holiday Planner Orchestrator - Coordinates all agents to plan perfect group outings
 */
export class HolidayPlanner {
    private calendarAgent: CalendarAgent
    private locationAgent: LocationAgent
    private restaurantAgent: RestaurantAgent
    private transportationAgent: TransportationAgent
    private llm: ChatGoogleGenerativeAI

    constructor(apiKey: string, googleCredentials?: any) {
        this.calendarAgent = new CalendarAgent(apiKey, googleCredentials)
        this.locationAgent = new LocationAgent(apiKey)
        this.restaurantAgent = new RestaurantAgent(apiKey)
        this.transportationAgent = new TransportationAgent(apiKey)
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
    }

    /**
     * Plan a complete group outing with all details and costs
     */
    async planOuting(params: PlanningParams): Promise<HolidayPlan> {
        console.log('🎯 Starting holiday planning...\n')

        // Step 1: Find free time slots
        console.log('📅 Step 1: Finding free time for all participants...')
        const timeSlot = await this.calendarAgent.findFreeTime(
            params.participants,
            params.startDate,
            params.endDate,
            params.duration || 4
        )
        console.log(`✅ Found ${timeSlot.availableSlots.length} available time slots\n`)

        // Step 2: Find suitable locations
        console.log('📍 Step 2: Finding outing locations...')
        const location = await this.locationAgent.findLocations({
            city: params.city,
            groupSize: params.participants.length,
            preferences: params.preferences?.activities,
            budget: params.preferences?.budget,
            date: timeSlot.recommendedSlot?.date,
            duration: params.duration || 4
        })
        console.log(`✅ Found ${location.locations.length} location options\n`)

        // Step 3: Find restaurants
        console.log('🍽️  Step 3: Finding restaurants...')
        const restaurant = await this.restaurantAgent.findRestaurants({
            location: location.bestOption.name,
            city: params.city,
            groupSize: params.participants.length,
            cuisine: params.preferences?.cuisine,
            budget: params.preferences?.budget,
            mealType: 'lunch'
        })
        console.log(`✅ Found ${restaurant.restaurants.length} restaurant options\n`)

        // Step 4: Find transportation
        console.log('🚗 Step 4: Finding transportation options...')
        const transportation = await this.transportationAgent.findTransportation({
            from: params.startLocation || `Downtown ${params.city}`,
            to: location.bestOption.name,
            city: params.city,
            groupSize: params.participants.length,
            date: timeSlot.recommendedSlot?.date,
            budget: params.preferences?.budget
        })
        console.log(`✅ Found ${transportation.options.length} transportation options\n`)

        // Step 5: Calculate total costs
        console.log('💰 Step 5: Calculating total costs...')
        const costBreakdown = this.calculateCosts(
            params.participants.length,
            location,
            restaurant,
            transportation
        )

        // Step 6: Generate summary
        console.log('📝 Step 6: Generating summary...\n')
        const summary = await this.generateSummary({
            timeSlot,
            location,
            restaurant,
            transportation,
            costBreakdown,
            participants: params.participants
        })

        return {
            timeSlot,
            location,
            restaurant,
            transportation,
            costBreakdown,
            summary
        }
    }

    /**
     * Calculate comprehensive cost breakdown
     */
    private calculateCosts(
        groupSize: number,
        location: LocationRecommendation,
        restaurant: RestaurantRecommendation,
        transportation: TransportRecommendation
    ): CostBreakdown {
        const locationCost = location.bestOption.estimatedCostPerPerson
        const restaurantCost = restaurant.bestOption.estimatedCostPerPerson
        const transportCost = transportation.bestOption.estimatedCostPerPerson

        const totalPerPerson = locationCost + restaurantCost + transportCost

        return {
            location: locationCost,
            restaurant: restaurantCost,
            transportation: transportCost,
            totalPerPerson,
            totalForGroup: totalPerPerson * groupSize,
            breakdown: [
                {
                    category: 'Location & Activities',
                    perPerson: locationCost,
                    total: locationCost * groupSize
                },
                {
                    category: 'Restaurant',
                    perPerson: restaurantCost,
                    total: restaurantCost * groupSize
                },
                {
                    category: 'Transportation',
                    perPerson: transportCost,
                    total: transportCost * groupSize
                }
            ]
        }
    }

    /**
     * Generate comprehensive summary of the plan
     */
    private async generateSummary(data: {
        timeSlot: FreeTimeResult
        location: LocationRecommendation
        restaurant: RestaurantRecommendation
        transportation: TransportRecommendation
        costBreakdown: CostBreakdown
        participants: string[]
    }): Promise<string> {
        const prompt = `
You are a travel coordinator creating a final summary for a group outing.

PARTICIPANTS: ${data.participants.join(', ')}

SCHEDULE:
Recommended Time: ${data.timeSlot.recommendedSlot?.date} at ${data.timeSlot.recommendedSlot?.start}

LOCATION:
${data.location.bestOption.name} - ${data.location.bestOption.type}
${data.location.bestOption.description}
Activities: ${data.location.bestOption.activities.join(', ')}
Cost: $${data.location.bestOption.estimatedCostPerPerson}/person

RESTAURANT:
${data.restaurant.bestOption.name} - ${data.restaurant.bestOption.cuisine}
${data.restaurant.bestOption.description}
Cost: $${data.restaurant.bestOption.estimatedCostPerPerson}/person

TRANSPORTATION:
${data.transportation.bestOption.method}
Duration: ${data.transportation.bestOption.duration}
Cost: $${data.transportation.bestOption.estimatedCostPerPerson}/person

TOTAL COST PER PERSON: $${data.costBreakdown.totalPerPerson.toFixed(2)}
TOTAL FOR GROUP: $${data.costBreakdown.totalForGroup.toFixed(2)}

Create a friendly, enthusiastic summary that includes:
1. An exciting introduction to the plan
2. Complete itinerary with timeline
3. What to bring/prepare
4. Meeting point and transportation details
5. Cost breakdown clearly explained
6. Any important tips or reminders
7. A motivating closing

Make it engaging and easy to share with the group!
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }

    /**
     * Generate a shareable message for iMessage
     */
    formatForIMessage(plan: HolidayPlan): string {
        const slot = plan.timeSlot.recommendedSlot

        return `🎉 GROUP OUTING PLAN 🎉

📅 When: ${slot?.date} at ${slot?.start}-${slot?.end}

📍 Location: ${plan.location.bestOption.name}
${plan.location.bestOption.activities.slice(0, 3).join(' • ')}

🍽️ Restaurant: ${plan.restaurant.bestOption.name}
${plan.restaurant.bestOption.cuisine} cuisine

🚗 Transportation: ${plan.transportation.bestOption.method}

💰 COST PER PERSON: $${plan.costBreakdown.totalPerPerson.toFixed(2)}
   • Location: $${plan.costBreakdown.location.toFixed(2)}
   • Food: $${plan.costBreakdown.restaurant.toFixed(2)}
   • Transport: $${plan.costBreakdown.transportation.toFixed(2)}

Total for group: $${plan.costBreakdown.totalForGroup.toFixed(2)}

Reply if you're in! 🙌`
    }

    /**
     * Get alternative options if the main plan doesn't work
     */
    async getAlternatives(plan: HolidayPlan): Promise<{
        locations: string[]
        restaurants: string[]
        transportation: string[]
    }> {
        return {
            locations: plan.location.locations
                .filter(l => l.name !== plan.location.bestOption.name)
                .map(l => `${l.name} - $${l.estimatedCostPerPerson}/person`),
            restaurants: plan.restaurant.restaurants
                .filter(r => r.name !== plan.restaurant.bestOption.name)
                .map(r => `${r.name} (${r.cuisine}) - $${r.estimatedCostPerPerson}/person`),
            transportation: plan.transportation.options
                .filter(t => t.method !== plan.transportation.bestOption.method)
                .map(t => `${t.method} - $${t.estimatedCostPerPerson}/person`)
        }
    }
}
