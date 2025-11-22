/**
 * Simplified Trial: Holiday Planner without Calendar Integration
 * 
 * Flow:
 * 1. Bot decides date automatically
 * 2. Ask location preference
 * 3. Scrape Reddit for location insights
 * 4. Ask food preference
 * 5. Ask budget
 * 6. Generate complete plan with transportation
 */

import 'dotenv/config'
import { IMessageClient } from '../src/client.js'
import { InteractiveAgent } from '../src/agents/interactive-agent.js'
import { LocationAgent } from '../src/agents/location-agent.js'
import { RestaurantAgent } from '../src/agents/restaurant-agent.js'
import { TransportationAgent } from '../src/agents/transportation-agent.js'
import { WeatherAgent } from '../src/agents/weather-agent.js'
import { RedditAgent } from '../src/agents/reddit-agent.js'
import { FlightAgent } from '../src/agents/flight-agent.js'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

async function simpleTrial() {
    // Configuration
    const geminiKey = process.env.GEMINI_API_KEY!
    const groupChatId = process.env.GROUP_CHAT_ID!
    const serpApiKey = process.env.SERPAPI_KEY
    const city = 'San Francisco'
    const participants = ['user1', 'user2', 'user3', 'user4']

    if (!geminiKey || !groupChatId) {
        console.error('❌ Missing GEMINI_API_KEY or GROUP_CHAT_ID in .env')
        process.exit(1)
    }

    console.log('🎯 Holiday Planner - Simple Trial\n')
    console.log('='.repeat(60) + '\n')

    if (serpApiKey) {
        console.log('🗺️  Serpapi: Enabled (Google Maps + Flights data)\n')
    } else {
        console.log('⚠️  Serpapi: Not configured (using AI estimates)\n')
    }

    const client = new IMessageClient()
    const interactive = new InteractiveAgent(geminiKey, groupChatId, participants, client)
    const locationAgent = new LocationAgent(geminiKey)
    const restaurantAgent = new RestaurantAgent(geminiKey)
    const transportAgent = new TransportationAgent(geminiKey, process.env.SERPAPI_KEY)
    const weatherAgent = new WeatherAgent(geminiKey)
    const redditAgent = new RedditAgent(geminiKey)
    const flightAgent = new FlightAgent(geminiKey)
    const llm = new ChatGoogleGenerativeAI({
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        apiKey: geminiKey
    })

    try {
        // STEP 0: Ask for calendar integration (but don't use it)
        console.log('📅 STEP 0: Asking for calendar integration\n')
        await client.send(
            groupChatId,
            `🎉 Welcome to Holiday Planner!\n\n` +
            `📱 Connect your calendar:\n` +
            `Link: http://localhost:3000\n\n` +
            `⏳ Waiting 1 minute for calendar connections...`
        )

        // Wait 1 minute for calendar connections
        console.log('⏳ Waiting 60 seconds for calendar connections...\n')
        await new Promise(resolve => setTimeout(resolve, 60000))

        // STEP 1: Auto-decide date (next Saturday)
        console.log('\n📅 STEP 1: Auto-selecting date\n')
        const today = new Date()
        const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
        const outingDate = new Date(today)
        outingDate.setDate(today.getDate() + daysUntilSaturday)
        const dateStr = outingDate.toISOString().split('T')[0]

        await client.send(
            groupChatId,
            `📅 Date Selected: ${dateStr} (next Saturday)\n` +
            `⏰ Time: 10:00 AM - 4:00 PM\n` +
            `📍 City: ${city}\n\n` +
            `Let's figure out where to go!`
        )

        // Check weather
        console.log('\n🌤️  Checking weather...\n')
        const weather = await weatherAgent.getWeatherForecast({ city, date: outingDate })
        await client.send(groupChatId, weatherAgent.formatWeatherReport(weather))

        // STEP 2: Ask location preference (WAIT FOR ANSWER)
        console.log('\n📍 STEP 2: Asking for location (waiting for at least 1 response)\n')
        const locationResponses = await interactive.askGroupQuestion(
            `📍 What type of place would you like to visit?\n\n` +
            `Examples: park, museum, beach, hiking trail, shopping district, etc.\n\n` +
            `⏳ Please reply with your preference...\n` +
            `⚠️  Waiting for at least 1 response (5 min timeout)`,
            300000 // 5 minutes
        )

        console.log(`\n✅ Got ${locationResponses.size} location response(s)\n`)

        if (locationResponses.size === 0) {
            await client.send(groupChatId, `⚠️  No responses received. Using default: outdoor park`)
        }

        // Get location recommendations
        const locationPrefs = Array.from(locationResponses.values())
        const searchPrefs = locationPrefs.length > 0 ? locationPrefs : ['outdoor', 'park']
        
        const locations = await locationAgent.findLocations({
            city,
            groupSize: participants.length,
            preferences: searchPrefs,
            budget: 'medium'
        })

        if (!locations || (Array.isArray(locations) && locations.length === 0)) {
            throw new Error('No locations found')
        }

        const chosenLocation = Array.isArray(locations) ? locations[0] : locations
        await client.send(
            groupChatId,
            `🎯 Great! Let's visit: ${chosenLocation.name}\n` +
            `📍 ${chosenLocation.address}\n` +
            `💰 Entry: $${chosenLocation.costPerPerson}/person\n\n` +
            `🔍 Getting insider tips from Reddit...`
        )

        // STEP 3: Scrape Reddit for insights
        console.log('\n📱 STEP 3: Scraping Reddit\n')
        const redditInsights = await redditAgent.searchLocation({
            location: chosenLocation.name,
            city,
            activityType: locationPrefs[0]
        })

        await client.send(
            groupChatId,
            redditAgent.formatInsights(redditInsights, chosenLocation.name)
        )

        // STEP 4: Ask food preference (WAIT FOR ANSWER)
        console.log('\n🍽️  STEP 4: Asking for food (waiting for response)\n')
        const foodResponses = await interactive.askGroupQuestion(
            `🍽️  What kind of food would you like?\n\n` +
            `Examples: Italian, Mexican, Chinese, Japanese, etc.\n\n` +
            `⏳ Reply with your preference (2 min timeout)...`,
            120000
        )

        console.log(`\n✅ Got ${foodResponses.size} food response(s)\n`)

        if (foodResponses.size === 0) {
            await client.send(groupChatId, `⚠️  No food preferences. I'll pick something good!`)
        }

        // STEP 5: Ask budget (WAIT FOR ANSWER)
        console.log('\n💰 STEP 5: Asking for budget (waiting for response)\n')
        const budgetResponses = await interactive.askGroupQuestion(
            `💰 What's your budget per person?\n\n` +
            `Reply: LOW ($30-50), MEDIUM ($50-100), or HIGH ($100+)\n\n` +
            `⏳ Reply with your budget (2 min timeout)...`,
            120000
        )

        console.log(`\n✅ Got ${budgetResponses.size} budget response(s)\n`)

        if (budgetResponses.size === 0) {
            await client.send(groupChatId, `⚠️  No budget specified. Using MEDIUM budget.`)
        }

        // Parse budget
        const budgetVals = Array.from(budgetResponses.values())
        const budget = budgetVals.length > 0 && budgetVals[0]?.toLowerCase().includes('high') ? 'high' :
                      budgetVals.length > 0 && budgetVals[0]?.toLowerCase().includes('low') ? 'low' : 'medium'

        // Get restaurant
        const foodPrefs = Array.from(foodResponses.values())
        const cuisinePrefs = foodPrefs.length > 0 ? foodPrefs : ['American']
        
        const restaurants = await restaurantAgent.findRestaurants({
            location: chosenLocation.name,
            city,
            groupSize: participants.length,
            cuisine: cuisinePrefs,
            budget
        })

        const chosenRestaurant = Array.isArray(restaurants) ? restaurants[0] : restaurants

        // STEP 6: Plan transportation (both ways)
        console.log('\n🚗 STEP 6: Planning transportation\n')
        
        await client.send(groupChatId, `🔧 Planning complete transportation...`)

        // Transportation TO location
        const transportToResult = await transportAgent.findTransportation({
            from: 'Downtown ' + city,
            to: chosenLocation.name,
            city,
            groupSize: participants.length,
            budget
        })
        const transportTo = Array.isArray(transportToResult) ? transportToResult[0] : transportToResult

        // Transportation FROM location
        const transportFromResult = await transportAgent.findTransportation({
            from: chosenLocation.name,
            to: 'Downtown ' + city,
            city,
            groupSize: participants.length,
            budget
        })
        const transportFrom = Array.isArray(transportFromResult) ? transportFromResult[0] : transportFromResult

        // STEP 7: Generate final timeline
        console.log('\n📋 STEP 7: Generating timeline\n')

        const totalCostPerPerson = 
            chosenLocation.costPerPerson +
            chosenRestaurant.avgCostPerPerson +
            (transportTo?.costPerPerson || 0) +
            (transportFrom?.costPerPerson || 0)

        const totalForGroup = totalCostPerPerson * participants.length

        const timeline = `📅 COMPLETE OUTING PLAN\n\n` +
            `🗓️  DATE & TIME\n` +
            `   ${dateStr} (Saturday)\n` +
            `   10:00 AM - 4:00 PM\n\n` +
            `🚗 TRANSPORTATION TO\n` +
            `   ${transportTo?.method || 'TBD'}\n` +
            `   Duration: ${transportTo?.duration || 'TBD'}\n` +
            `   Cost: $${transportTo?.costPerPerson || 0}/person\n\n` +
            `📍 LOCATION\n` +
            `   ${chosenLocation.name}\n` +
            `   ${chosenLocation.address}\n` +
            `   Entry: $${chosenLocation.costPerPerson}/person\n` +
            `   Activities: ${chosenLocation.activities.slice(0, 3).join(', ')}\n\n` +
            `🍽️  RESTAURANT\n` +
            `   ${chosenRestaurant.name}\n` +
            `   Cuisine: ${chosenRestaurant.cuisine}\n` +
            `   Cost: $${chosenRestaurant.avgCostPerPerson}/person\n\n` +
            `🚗 TRANSPORTATION BACK\n` +
            `   ${transportFrom?.method || 'TBD'}\n` +
            `   Duration: ${transportFrom?.duration || 'TBD'}\n` +
            `   Cost: $${transportFrom?.costPerPerson || 0}/person\n\n` +
            `💰 COST BREAKDOWN\n` +
            `   Transportation (roundtrip): $${(transportTo?.costPerPerson || 0) + (transportFrom?.costPerPerson || 0)}/person\n` +
            `   Location & Activities: $${chosenLocation.costPerPerson}/person\n` +
            `   Restaurant: $${chosenRestaurant.avgCostPerPerson}/person\n` +
            `   ──────────────────\n` +
            `   TOTAL PER PERSON: $${totalCostPerPerson.toFixed(2)}\n` +
            `   TOTAL FOR GROUP: $${totalForGroup.toFixed(2)}\n\n` +
            `🌤️  WEATHER: ${weather.condition}, ${weather.temperature.min}-${weather.temperature.max}°C\n` +
            `💡 ${weather.recommendation}\n\n` +
            `✅ Ready to go? Reply YES to confirm!`

        await client.send(groupChatId, timeline)

        // Wait for confirmation
        console.log('\n✅ STEP 8: Waiting for confirmation\n')
        const confirmation = await interactive.askConfirmation(
            '✅ Does this plan work for everyone?'
        )

        if (confirmation.confirmed) {
            await client.send(
                groupChatId,
                `🎉 PLAN CONFIRMED!\n\n` +
                `See you on ${dateStr} at 10:00 AM!\n` +
                `Meeting point: Downtown ${city}\n\n` +
                `Have a great time! 🚀`
            )
            console.log('\n✅ Plan confirmed by group!\n')
        } else {
            await client.send(
                groupChatId,
                `📝 No problem! Let me know what you'd like to change.`
            )
            console.log('\n⚠️  Plan not confirmed\n')
        }

        process.exit(0)

    } catch (error) {
        console.error('\n❌ Error:', error)
        await client.send(groupChatId, '❌ Sorry, something went wrong. Please try again.')
        process.exit(1)
    }
}

simpleTrial().catch(console.error)
