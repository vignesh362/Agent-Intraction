import { HolidayPlanner, PlanningParams } from './holiday-planner.js'
import { InteractiveAgent } from './interactive-agent.js'
import { CalendarAgent } from './calendar-agent.js'
import { WeatherAgent } from './weather-agent.js'
import { CalendarOAuthManager } from './calendar-oauth.js'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { IMessageClient } from '../client.js'

export interface InteractivePlanningResult {
    finalPlan: any
    conversationLog: string[]
    allResponses: Map<string, any>
}

export interface InteractivePlannerConfig {
    apiKey: string
    groupChatId: string
    participants: string[]
    googleClientId?: string
    googleClientSecret?: string
    oauthRedirectUri?: string
    useOAuth?: boolean
}

/**
 * Interactive Holiday Planner
 * 
 * Workflow:
 * 0. (Optional) Connect calendars via OAuth
 * 1. Analyze calendars to find free dates
 * 2. Ask group about location preferences
 * 3. Ask about restaurant preferences
 * 4. Ask about transportation preferences
 * 5. Generate final plan with costs
 * 6. Ask for confirmation
 * 7. Send final plan to group
 */
export class InteractiveHolidayPlanner {
    private planner: HolidayPlanner
    private interactive: InteractiveAgent
    private calendar: CalendarAgent
    private weather: WeatherAgent
    private oauthManager?: CalendarOAuthManager
    private llm: ChatGoogleGenerativeAI
    private conversationLog: string[]
    private config: InteractivePlannerConfig

    constructor(config: InteractivePlannerConfig) {
        this.config = config
        this.planner = new HolidayPlanner(config.apiKey)
        const client = new IMessageClient()  // Create client once
        this.interactive = new InteractiveAgent(
            config.apiKey,
            config.groupChatId,
            config.participants,
            client  // Pass client to InteractiveAgent
        )
        this.calendar = new CalendarAgent(config.apiKey)
        this.weather = new WeatherAgent(config.apiKey)
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: config.apiKey
        })
        this.conversationLog = []

        // Initialize OAuth if credentials provided
        if (config.useOAuth && config.googleClientId && config.googleClientSecret) {
            this.oauthManager = new CalendarOAuthManager(
                config.googleClientId,
                config.googleClientSecret,
                config.oauthRedirectUri || 'http://localhost:3000/oauth/callback'
            )
        }
    }

    /**
     * Connect calendars via OAuth (optional step 0)
     */
    async connectCalendars(imessageClient: IMessageClient): Promise<boolean> {
        if (!this.oauthManager) {
            console.log('⚠️  OAuth not configured, skipping calendar connection')
            return false
        }

        try {
            console.log('\n🔗 STEP 0: Connecting Calendars via OAuth\n')
            this.log('Step 0: Starting OAuth calendar connections')

            // Send connection link to group (this also starts the server)
            await this.oauthManager.sendConnectionLinkToGroup(
                this.config.groupChatId,
                imessageClient
            )

            // Wait for at least 50% of participants to connect (5 minute timeout)
            await this.oauthManager.waitForConnections(
                this.config.participants,
                300000, // 5 minutes
                0.5 // 50% minimum threshold
            )

            console.log('✅ All calendars connected!')
            this.log('All participants connected their calendars')

            // Update calendar agent with OAuth clients
            const connections = this.oauthManager.getConnections()
            for (const [email, connection] of connections) {
                const authClient = this.oauthManager.getAuthClientForUser(email)
                if (authClient) {
                    // Calendar agent will use these OAuth clients for API calls
                    this.calendar = new CalendarAgent(
                        this.config.apiKey,
                        { auth: authClient }
                    )
                }
            }

            return true
        } catch (error) {
            console.error('❌ OAuth connection failed:', error)
            this.log('OAuth connection failed, will use LLM fallback')
            return false
        }
    }

    /**
     * Start the interactive planning process
     */
    async startPlanning(params: {
        city: string
        participants: string[]
        startDate: Date
        endDate: Date
        duration?: number
        startLocation?: string
    }): Promise<InteractivePlanningResult> {
        console.log('🎯 Starting Interactive Holiday Planning...\n')
        console.log('=' .repeat(60))

        const allResponses = new Map<string, any>()

        // STEP 1: Find free time slots from calendars
        console.log('\n📅 STEP 1: Analyzing Calendars\n')
        this.log('Step 1: Analyzing calendars for free time slots')

        const freeTimeSlots = await this.calendar.findFreeTime(
            params.participants,
            params.startDate,
            params.endDate,
            params.duration || 6
        )

        if (freeTimeSlots.availableSlots.length === 0) {
            const message = '❌ No common free time slots found for everyone. Please adjust your date range.'
            await this.interactive.sendSummary(message)
            throw new Error(message)
        }

        // Send available dates to group and ask for choice
        const dateOptions = freeTimeSlots.availableSlots.slice(0, 3)
            .map((slot, i) => `${i + 1}. ${slot.date} (${slot.start} - ${slot.end})`)
            .join('\n')

        this.log('Asking group to choose a date')

        const dateChoiceResponses = await this.interactive.askGroupQuestion(
            `🎉 Found free time slots for everyone!\n\n${dateOptions}\n\nLet's plan something!\n\n` +
            `📅 Reply with 1, 2, or 3 to choose your preferred date...`,
            120000 // 2 minutes timeout
        )

        console.log(`\n✅ Collected ${dateChoiceResponses.size} date choice(s)\n`)
        this.log(`Date choices: ${Array.from(dateChoiceResponses.values()).join(', ')}`)

        // Parse the choice (get most common choice, default to 1)
        const choices = Array.from(dateChoiceResponses.values())
            .map(c => parseInt(c.trim()))
            .filter(c => c >= 1 && c <= 3)
        
        const chosenIndex = choices.length > 0 ? choices[0] - 1 : 0
        const chosenSlot = freeTimeSlots.availableSlots[chosenIndex]

        await this.interactive.sendSummary(
            `✅ Confirmed! Planning for ${chosenSlot.date} (${chosenSlot.start} - ${chosenSlot.end})`
        )

        // STEP 1.5: Check weather for the chosen date
        console.log('\n🌤️  STEP 1.5: Checking Weather\n')
        this.log('Step 1.5: Fetching weather forecast')

        const chosenDate = new Date(chosenSlot.date)
        const weatherData = await this.weather.getWeatherForecast({
            city: params.city,
            date: chosenDate
        })

        const weatherReport = this.weather.formatWeatherReport(weatherData)
        await this.interactive.sendSummary(weatherReport)
        
        console.log(`\n✅ Weather forecast sent\n`)
        this.log(`Weather: ${weatherData.condition}, ${weatherData.temperature.min}-${weatherData.temperature.max}°C`)

        // STEP 2: Ask about location preferences
        console.log('\n📍 STEP 2: Getting Location Preferences\n')
        this.log('Step 2: Asking about location preferences')

        const locationResponses = await this.interactive.askGroupQuestion(
            `📍 What kind of place would you like to visit on ${chosenSlot.date}?\n\n` +
            `Examples: outdoor park, museum, beach, shopping district, hiking trail, etc.\n\n` +
            `⏳ Reply with your preference...`,
            300000
        )

        allResponses.set('location_preferences', locationResponses)
        console.log(`✅ Collected ${locationResponses.size} location responses\n`)

        // Analyze location responses
        const locationPrefs = await this.analyzeLocationPreferences(locationResponses)
        this.log(`Location preferences: ${JSON.stringify(locationPrefs)}`)

        // STEP 3: Ask about food preferences
        console.log('\n🍽️  STEP 3: Getting Restaurant Preferences\n')
        this.log('Step 3: Asking about restaurant preferences')

        const foodResponses = await this.interactive.askGroupQuestion(
            `🍽️  What kind of food would you like?\n\n` +
            `Examples: Italian, Mexican, Chinese, Japanese, American, vegetarian, etc.\n\n` +
            `⏳ Reply with your preference...`,
            300000
        )

        allResponses.set('food_preferences', foodResponses)
        console.log(`✅ Collected ${foodResponses.size} food responses\n`)

        const foodPrefs = await this.analyzeFoodPreferences(foodResponses)
        this.log(`Food preferences: ${JSON.stringify(foodPrefs)}`)

        // STEP 4: Ask about budget
        console.log('\n💰 STEP 4: Getting Budget Preferences\n')
        this.log('Step 4: Asking about budget')

        const budgetResponses = await this.interactive.askGroupQuestion(
            `💰 What's your budget per person?\n\n` +
            `Reply with: LOW ($30-50), MEDIUM ($50-100), or HIGH ($100+)\n\n` +
            `⏳ Reply with your budget...`,
            300000
        )

        allResponses.set('budget', budgetResponses)
        console.log(`✅ Collected ${budgetResponses.size} budget responses\n`)

        const budget = await this.analyzeBudget(budgetResponses)
        this.log(`Budget: ${budget}`)

        // STEP 5: Generate plan based on responses
        console.log('\n🔧 STEP 5: Generating Plan\n')
        this.log('Step 5: Generating complete plan')

        await this.interactive.sendSummary(
            `⏳ Great! Planning your perfect outing based on your preferences...\n\n` +
            `This will take a moment...`
        )

        const planningParams: PlanningParams = {
            city: params.city,
            participants: params.participants,
            startDate: params.startDate,
            endDate: params.endDate,
            duration: params.duration || 6,
            startLocation: params.startLocation,
            preferences: {
                activities: locationPrefs,
                cuisine: foodPrefs,
                budget: budget as 'low' | 'medium' | 'high'
            }
        }

        const plan = await this.planner.planOuting(planningParams)

        // STEP 6: Send POTENTIAL TIMELINE and wait for confirmation
        console.log('\n📋 STEP 6: Sending Potential Timeline & Waiting for Confirmation\n')
        this.log('Step 6: Presenting potential timeline to group')

        const timelineMessage = `📅 POTENTIAL TIMELINE\n\n` +
            `Based on your preferences, here's the plan:\n\n` +
            this.formatPlanForGroup(plan) +
            `\n\n⏳ Please review and let us know if this works...`
        
        await this.interactive.sendSummary(timelineMessage)
        console.log('⏳ Waiting for everyone to review the timeline...\n')

        const confirmation = await this.interactive.askConfirmation(
            `\n✅ Does this timeline work for everyone?\n\n` +
            `Reply YES to confirm or NO if you need changes.\n\n` +
            `⏳ Waiting for your responses...`
        )

        allResponses.set('confirmation', confirmation.responses)
        console.log(`\n${confirmation.confirmed ? '✅ Timeline approved by group!' : '❌ Timeline needs changes'}\n`)

        if (!confirmation.confirmed) {
            console.log('\n❌ STEP 7: Timeline Not Approved\n')
            this.log('Timeline not confirmed, asking for adjustments')
            
            await this.interactive.sendSummary(
                `📝 Got it! The timeline needs adjustments.\n\n` +
                `What would you like to change? (location, restaurant, transportation, or date)`
            )
            
            const adjustmentResponses = await this.interactive.askGroupQuestion(
                `💬 Please tell us what needs to change...`,
                300000
            )

            allResponses.set('adjustments', adjustmentResponses)
            this.log('Got adjustment requests, would regenerate plan here')
            console.log('⚠️  Plan requires revisions based on feedback\n')
        } else {
            // STEP 7: Send final confirmation
            console.log('\n🎉 STEP 7: Sending Final Confirmed Plan\n')
            this.log('Step 7: Sending final confirmed plan')

            const finalMessage = this.planner.formatForIMessage(plan)
            await this.interactive.sendSummary(
                `🎉 FINAL PLAN - CONFIRMED!\n\n${finalMessage}\n\n` +
                `✅ Everyone has approved this timeline!\n` +
                `📅 Mark your calendars!\n` +
                `See you all on ${chosenSlot.date}! 🙌`
            )
            console.log('✅ Final plan sent to group!\n')
        }

        console.log('\n✨ Interactive planning complete!\n')

        return {
            finalPlan: plan,
            conversationLog: this.conversationLog,
            allResponses
        }
    }

    private async analyzeLocationPreferences(responses: Map<string, string>): Promise<string[]> {
        const responsesText = Array.from(responses.values()).join('\n')
        const prompt = `
Analyze these location preferences and extract activity types:
${responsesText}

Return a JSON array of activity keywords like: ["outdoor", "scenic", "cultural", "adventure"]
Return ONLY the JSON array, no other text.
`
        const result = await this.llm.invoke(prompt)
        try {
            return JSON.parse(result.content as string)
        } catch {
            return ['outdoor', 'recreational']
        }
    }

    private async analyzeFoodPreferences(responses: Map<string, string>): Promise<string[]> {
        const responsesText = Array.from(responses.values()).join('\n')
        const prompt = `
Analyze these food preferences and extract cuisine types:
${responsesText}

Return a JSON array of cuisine types like: ["Italian", "Mexican", "Asian"]
Return ONLY the JSON array, no other text.
`
        const result = await this.llm.invoke(prompt)
        try {
            return JSON.parse(result.content as string)
        } catch {
            return ['American']
        }
    }

    private async analyzeBudget(responses: Map<string, string>): Promise<string> {
        const responsesText = Array.from(responses.values()).join('\n').toLowerCase()
        
        if (responsesText.includes('low') || responsesText.includes('cheap')) {
            return 'low'
        } else if (responsesText.includes('high') || responsesText.includes('expensive')) {
            return 'high'
        }
        return 'medium'
    }

    private formatPlanForGroup(plan: any): string {
        const slot = plan.timeSlot.recommendedSlot

        return `📋 HERE'S YOUR PLAN!\n\n` +
            `📅 When: ${slot?.date} at ${slot?.start}-${slot?.end}\n\n` +
            `📍 Location: ${plan.location.bestOption.name}\n` +
            `   ${plan.location.bestOption.description}\n` +
            `   Cost: $${plan.location.bestOption.estimatedCostPerPerson}/person\n\n` +
            `🍽️  Restaurant: ${plan.restaurant.bestOption.name}\n` +
            `   ${plan.restaurant.bestOption.cuisine} cuisine\n` +
            `   Cost: $${plan.restaurant.bestOption.estimatedCostPerPerson}/person\n\n` +
            `🚗 Transportation: ${plan.transportation.bestOption.method}\n` +
            `   ${plan.transportation.bestOption.duration}\n` +
            `   Cost: $${plan.transportation.bestOption.estimatedCostPerPerson}/person\n\n` +
            `💰 TOTAL PER PERSON: $${plan.costBreakdown.totalPerPerson.toFixed(2)}\n` +
            `💵 Total for group: $${plan.costBreakdown.totalForGroup.toFixed(2)}`
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString()
        this.conversationLog.push(`[${timestamp}] ${message}`)
    }

    async close(): Promise<void> {
        await this.interactive.close()
    }
}
