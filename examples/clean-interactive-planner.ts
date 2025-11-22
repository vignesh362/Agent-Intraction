/**
 * Clean Interactive Holiday Planner
 * 
 * Flow:
 * 1. Ask for calendar integration (optional)
 * 2. Show multiple dates and let users choose one
 * 3. Check weather/climate for chosen date
 * 4. Suggest places based on weather and time availability
 * 5. Wait for user to choose location
 * 6. Show restaurant options near chosen location
 * 7. Wait for user to choose restaurant
 * 8. Generate final timeline with:
 *    - Transportation (to and from)
 *    - Reddit suggestions
 *    - Complete budget breakdown per person
 */

import 'dotenv/config'
import { IMessageClient } from '../src/client.js'
import { InteractiveAgent } from '../src/agents/interactive-agent.js'
import { CalendarAgent } from '../src/agents/calendar-agent.js'
import { WeatherAgent } from '../src/agents/weather-agent.js'
import { LocationAgent } from '../src/agents/location-agent.js'
import { RestaurantAgent } from '../src/agents/restaurant-agent.js'
import { TransportationAgent } from '../src/agents/transportation-agent.js'
import { RedditAgent } from '../src/agents/reddit-agent.js'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

async function cleanInteractivePlanner() {
    // Configuration
    const geminiKey = process.env.GEMINI_API_KEY!
    const groupChatId = process.env.GROUP_CHAT_ID!
    const city = 'San Francisco'
    const participants = ['user1', 'user2', 'user3', 'user4']

    if (!geminiKey || !groupChatId) {
        console.error('❌ Missing GEMINI_API_KEY or GROUP_CHAT_ID in .env')
        process.exit(1)
    }

    console.log('🎯 Clean Interactive Holiday Planner\n')
    console.log('='.repeat(60) + '\n')

    const client = new IMessageClient()
    const interactive = new InteractiveAgent(geminiKey, groupChatId, participants, client)
    const calendarAgent = new CalendarAgent(geminiKey)
    const weatherAgent = new WeatherAgent(geminiKey)
    const locationAgent = new LocationAgent(geminiKey)
    const restaurantAgent = new RestaurantAgent(geminiKey)
    const transportAgent = new TransportationAgent(geminiKey, process.env.SERPAPI_KEY)
    const redditAgent = new RedditAgent(geminiKey)

    try {
        // ============================================================
        // STEP 1: Ask for Calendar Integration
        // ============================================================
        console.log('📅 STEP 1: Asking for calendar integration\n')
        await client.send(
            groupChatId,
            `🎉 Welcome to Holiday Planner!\n\n` +
            `📱 OPTIONAL: Connect your calendar for smart scheduling\n` +
            `Link: http://localhost:3000\n\n` +
            `⏳ Waiting 30 seconds for calendar connections...\n` +
            `(You can skip this and I'll suggest dates automatically)`
        )

        console.log('⏳ Waiting 30 seconds for calendar connections...\n')
        await new Promise(resolve => setTimeout(resolve, 30000))

        // ============================================================
        // STEP 2: Show Multiple Dates and Let Users Choose
        // ============================================================
        console.log('\n📅 STEP 2: Presenting multiple date options\n')

        // Generate 3 date options (next 3 Saturdays)
        const today = new Date()
        const dateOptions: Array<{ date: Date; dateStr: string; label: string }> = []
        
        for (let i = 1; i <= 3; i++) {
            const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
            const optionDate = new Date(today)
            optionDate.setDate(today.getDate() + daysUntilSaturday + (i - 1) * 7)
            
            const dateStr = optionDate.toISOString().split('T')[0]
            const label = i === 1 ? 'This Saturday' : i === 2 ? 'Next Saturday' : 'In 2 Saturdays'
            
            dateOptions.push({ date: optionDate, dateStr, label })
        }

        const dateMessage = `📅 AVAILABLE DATES\n\n` +
            dateOptions.map((opt, i) => 
                `${i + 1}. ${opt.dateStr} (${opt.label})`
            ).join('\n') +
            `\n\n⏳ Please reply with 1, 2, or 3 to choose your preferred date...`

        await client.send(groupChatId, dateMessage)

        const dateChoices = await interactive.askGroupQuestion(
            `Waiting for date choice...`,
            180000 // 3 minutes
        )

        console.log(`\n✅ Got ${dateChoices.size} date choice(s)`)
        console.log('📥 USER INPUTS (Date Choices):')
        dateChoices.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        // Parse date choice
        const choices = Array.from(dateChoices.values())
            .map(c => parseInt(c.trim()))
            .filter(c => c >= 1 && c <= 3)
        
        const chosenIndex = choices.length > 0 ? Math.round(choices.reduce((a, b) => a + b) / choices.length) - 1 : 0
        const chosenDate = dateOptions[chosenIndex]

        await client.send(
            groupChatId,
            `✅ Great! Selected: ${chosenDate.dateStr} (${chosenDate.label})\n` +
            `⏰ Time: 10:00 AM - 4:00 PM\n\n` +
            `🌤️  Checking weather...`
        )

        // ============================================================
        // STEP 3: Check Weather/Climate for Chosen Date
        // ============================================================
        console.log('\n🌤️  STEP 3: Checking weather/climate\n')

        const weather = await weatherAgent.getWeatherForecast({
            city,
            date: chosenDate.date
        })

        const weatherReport = weatherAgent.formatWeatherReport(weather)
        await client.send(groupChatId, weatherReport)

        console.log(`✅ Weather: ${weather.condition}, ${weather.temperature.min}-${weather.temperature.max}°C\n`)

        // ============================================================
        // STEP 4: Suggest Places Based on Weather and Preferences
        // ============================================================
        console.log('\n📍 STEP 4: Suggesting places based on weather\n')

        await client.send(
            groupChatId,
            `🔍 Based on the weather, finding perfect places for you...\n\n` +
            `📍 What type of activity would you prefer?\n\n` +
            `Examples:\n` +
            `- Outdoor (parks, beaches, hiking)\n` +
            `- Indoor (museums, galleries, shopping)\n` +
            `- Mixed (botanical gardens, zoos)\n` +
            `- Adventure (water sports, climbing)\n\n` +
            `⏳ Reply with your preference (3 min timeout)...`
        )

        const activityResponses = await interactive.askGroupQuestion(
            `Waiting for activity preferences...`,
            180000
        )

        console.log(`\n✅ Got ${activityResponses.size} activity response(s)`)
        console.log('📥 USER INPUTS (Activity Preferences):')
        activityResponses.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        // Determine activity type based on weather and preferences
        const activityPrefs = Array.from(activityResponses.values())
        const weatherPreference = weather.temperature.avg > 15 ? 'outdoor' : 'indoor'
        const userPreferences = activityPrefs.length > 0 ? activityPrefs : [weatherPreference]

        await client.send(
            groupChatId,
            `🔍 Finding best locations based on:\n` +
            `   • Weather: ${weather.condition}\n` +
            `   • Your preferences: ${userPreferences.join(', ')}\n` +
            `   • Group size: ${participants.length}\n\n` +
            `⏳ Searching...`
        )

        const locationResult = await locationAgent.findLocations({
            city,
            groupSize: participants.length,
            preferences: userPreferences,
            budget: 'medium'
        })

        // Present top 3 locations
        const locationList = locationResult.locations.slice(0, 3)
        
        const locationMessage = `📍 TOP LOCATION OPTIONS\n\n` +
            locationList.map((loc, i) => 
                `${i + 1}. ${loc.name}\n` +
                `   📍 ${loc.address || 'Address TBD'}\n` +
                `   🎯 Activities: ${(loc.activities || []).slice(0, 3).join(', ') || 'Various activities'}\n` +
                `   💰 Cost: $${loc.estimatedCostPerPerson}/person\n`
            ).join('\n') +
            `\n⏳ Reply with 1, 2, or 3 to choose your location...`

        await client.send(groupChatId, locationMessage)

        // ============================================================
        // STEP 5: Wait for User to Choose Location
        // ============================================================
        console.log('\n📍 STEP 5: Waiting for location choice\n')

        const locationChoices = await interactive.askGroupQuestion(
            `Waiting for location choice...`,
            180000
        )

        console.log(`\n✅ Got ${locationChoices.size} location choice(s)`)
        console.log('📥 USER INPUTS (Location Choices):')
        locationChoices.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        // Parse location choice
        const locChoices = Array.from(locationChoices.values())
            .map(c => parseInt(c.trim()))
            .filter(c => c >= 1 && c <= locationList.length)
        
        const chosenLocIndex = locChoices.length > 0 ? locChoices[0] - 1 : 0
        const chosenLocation = locationList[chosenLocIndex]

        await client.send(
            groupChatId,
            `🎯 Perfect! You've chosen: ${chosenLocation.name}\n\n` +
            `📱 Getting insider tips from Reddit...`
        )

        // Get Reddit insights for chosen location
        console.log('\n📱 Getting Reddit insights\n')
        const redditInsights = await redditAgent.searchLocation({
            location: chosenLocation.name,
            city,
            activityType: userPreferences[0]
        })

        const redditReport = redditAgent.formatInsights(redditInsights, chosenLocation.name)
        await client.send(groupChatId, redditReport)

        // ============================================================
        // STEP 6: Show Restaurant Options Near Chosen Location
        // ============================================================
        console.log('\n🍽️  STEP 6: Finding restaurants near chosen location\n')

        await client.send(
            groupChatId,
            `🍽️  Now let's find a great place to eat!\n\n` +
            `What type of cuisine would you prefer?\n\n` +
            `Examples: Italian, Mexican, Chinese, Japanese, Indian, Mediterranean\n\n` +
            `⏳ Reply with your preference (3 min timeout)...`
        )

        const cuisineResponses = await interactive.askGroupQuestion(
            `Waiting for cuisine preferences...`,
            180000
        )

        console.log(`\n✅ Got ${cuisineResponses.size} cuisine response(s)`)
        console.log('📥 USER INPUTS (Cuisine Preferences):')
        cuisineResponses.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        // Ask about budget
        await client.send(
            groupChatId,
            `💰 What's your budget for food per person?\n\n` +
            `Reply with:\n` +
            `• LOW ($15-30)\n` +
            `• MEDIUM ($30-60)\n` +
            `• HIGH ($60+)\n\n` +
            `⏳ Reply with your budget...`
        )

        const budgetResponses = await interactive.askGroupQuestion(
            `Waiting for budget preferences...`,
            180000
        )

        console.log(`\n✅ Got ${budgetResponses.size} budget response(s)`)
        console.log('📥 USER INPUTS (Budget Preferences):')
        budgetResponses.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        // Parse preferences
        const cuisinePrefs = Array.from(cuisineResponses.values())
        const cuisines = cuisinePrefs.length > 0 ? cuisinePrefs : ['American']
        
        const budgetVals = Array.from(budgetResponses.values())
        const budget = budgetVals.some(b => b.toLowerCase().includes('high')) ? 'high' :
                      budgetVals.some(b => b.toLowerCase().includes('low')) ? 'low' : 'medium'

        await client.send(
            groupChatId,
            `🔍 Finding restaurants near ${chosenLocation.name}...\n` +
            `   • Cuisine: ${cuisines.join(', ')}\n` +
            `   • Budget: ${budget.toUpperCase()}\n\n` +
            `⏳ Searching...`
        )

        const restaurantResult = await restaurantAgent.findRestaurants({
            location: chosenLocation.name,
            city,
            groupSize: participants.length,
            cuisine: cuisines,
            budget
        })

        // Present top 3 restaurants
        const restaurantList = restaurantResult.restaurants.slice(0, 3)
        
        const restaurantMessage = `🍽️  TOP RESTAURANT OPTIONS\n\n` +
            restaurantList.map((rest, i) => 
                `${i + 1}. ${rest.name}\n` +
                `   🍴 Cuisine: ${rest.cuisine}\n` +
                `   ⭐ Rating: ${rest.rating || 'N/A'}/5\n` +
                `   💰 Cost: $${rest.estimatedCostPerPerson}/person\n`
            ).join('\n') +
            `\n⏳ Reply with 1, 2, or 3 to choose your restaurant...`

        await client.send(groupChatId, restaurantMessage)

        // ============================================================
        // STEP 7: Wait for Restaurant Choice
        // ============================================================
        console.log('\n🍽️  STEP 7: Waiting for restaurant choice\n')

        const restaurantChoices = await interactive.askGroupQuestion(
            `Waiting for restaurant choice...`,
            180000
        )

        console.log(`\n✅ Got ${restaurantChoices.size} restaurant choice(s)`)
        console.log('📥 USER INPUTS (Restaurant Choices):')
        restaurantChoices.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        // Parse restaurant choice
        const restChoices = Array.from(restaurantChoices.values())
            .map(c => parseInt(c.trim()))
            .filter(c => c >= 1 && c <= restaurantList.length)
        
        const chosenRestIndex = restChoices.length > 0 ? restChoices[0] - 1 : 0
        const chosenRestaurant = restaurantList[chosenRestIndex]

        await client.send(
            groupChatId,
            `🎯 Excellent choice! ${chosenRestaurant.name}\n\n` +
            `🚗 Now planning transportation...`
        )

        // ============================================================
        // STEP 8: Generate Final Timeline with Everything
        // ============================================================
        console.log('\n🚗 STEP 8: Planning complete transportation\n')

        // Transportation TO location
        const transportTo = await transportAgent.findTransportation({
            from: 'Downtown ' + city,
            to: chosenLocation.name,
            city,
            groupSize: participants.length,
            budget
        })
        const transportToOption = Array.isArray(transportTo) ? transportTo[0] : transportTo

        // Transportation FROM location
        const transportFrom = await transportAgent.findTransportation({
            from: chosenLocation.name,
            to: 'Downtown ' + city,
            city,
            groupSize: participants.length,
            budget
        })
        const transportFromOption = Array.isArray(transportFrom) ? transportFrom[0] : transportFrom

        // ============================================================
        // Calculate Complete Budget
        // ============================================================
        console.log('\n💰 Calculating complete budget breakdown\n')

        const costs = {
            transportTo: transportToOption?.costPerPerson || 0,
            location: chosenLocation.estimatedCostPerPerson,
            restaurant: chosenRestaurant.estimatedCostPerPerson,
            transportFrom: transportFromOption?.costPerPerson || 0
        }

        const totalPerPerson = costs.transportTo + costs.location + costs.restaurant + costs.transportFrom
        const totalForGroup = totalPerPerson * participants.length

        // ============================================================
        // Send Final Complete Timeline
        // ============================================================
        console.log('\n📋 STEP 9: Sending complete timeline\n')

        const finalTimeline = `
╔════════════════════════════════════════╗
║     🎉 YOUR COMPLETE OUTING PLAN      ║
╚════════════════════════════════════════╝

📅 DATE & TIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📆 ${chosenDate.dateStr} (${chosenDate.label})
⏰ 10:00 AM - 4:00 PM
👥 ${participants.length} people

🌤️  WEATHER FORECAST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${weather.condition}
🌡️  Temperature: ${weather.temperature.min}°C - ${weather.temperature.max}°C
💧 Humidity: ${weather.humidity}%
💡 ${weather.recommendation}

🚗 OUTBOUND TRANSPORTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: Downtown ${city}
To: ${chosenLocation.name}
Method: ${transportToOption?.method || 'TBD'}
Duration: ${transportToOption?.duration || 'TBD'}
💰 Cost: $${costs.transportTo}/person

📍 MAIN LOCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 ${chosenLocation.name}
📍 ${chosenLocation.address || 'Address TBD'}
🎪 Activities: ${(chosenLocation.activities || []).slice(0, 4).join(', ') || 'Various activities'}
💰 Entry Fee: $${costs.location}/person

📱 REDDIT INSIDER TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${redditInsights.tips.slice(0, 3).map(tip => `• ${tip}`).join('\n')}

🍽️  RESTAURANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍴 ${chosenRestaurant.name}
🌮 Cuisine: ${chosenRestaurant.cuisine}
⭐ Rating: ${chosenRestaurant.rating}/5
💰 Cost: $${costs.restaurant}/person

🚗 RETURN TRANSPORTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: ${chosenLocation.name}
To: Downtown ${city}
Method: ${transportFromOption?.method || 'TBD'}
Duration: ${transportFromOption?.duration || 'TBD'}
💰 Cost: $${costs.transportFrom}/person

💰 COMPLETE COST BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚗 Outbound Transport:  $${costs.transportTo.toFixed(2)}/person
📍 Location & Entry:    $${costs.location.toFixed(2)}/person
🍽️  Restaurant & Food:  $${costs.restaurant.toFixed(2)}/person
🚗 Return Transport:    $${costs.transportFrom.toFixed(2)}/person
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL PER PERSON:    $${totalPerPerson.toFixed(2)}
💰 TOTAL FOR GROUP:     $${totalForGroup.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Does this plan work for everyone?
Reply YES to confirm or NO to make changes.
`

        await client.send(groupChatId, finalTimeline)

        // ============================================================
        // Wait for Final Confirmation
        // ============================================================
        console.log('\n✅ STEP 10: Waiting for final confirmation\n')

        const confirmation = await interactive.askConfirmation(
            '⏳ Waiting for your confirmation...'
        )

        console.log(`\n✅ Got ${confirmation.responses.size} confirmation response(s)`)
        console.log('📥 USER INPUTS (Final Confirmation):')
        confirmation.responses.forEach((value, user) => {
            console.log(`   ${user}: "${value}"`)
        })
        console.log()

        if (confirmation.confirmed) {
            await client.send(
                groupChatId,
                `🎉 PLAN CONFIRMED!\n\n` +
                `✅ Everyone has approved the plan!\n` +
                `📅 Mark your calendars for ${chosenDate.dateStr}!\n` +
                `📍 Meeting point: Downtown ${city} at 10:00 AM\n\n` +
                `See you all there! Have an amazing time! 🚀`
            )
            console.log('\n✅ Plan confirmed and finalized!\n')
        } else {
            await client.send(
                groupChatId,
                `📝 No problem! Let me know what you'd like to change:\n` +
                `• Date\n` +
                `• Location\n` +
                `• Restaurant\n` +
                `• Transportation\n` +
                `• Budget\n\n` +
                `Reply with what needs adjustment...`
            )
            console.log('\n⚠️  Plan needs revisions\n')
        }

        console.log('\n' + '='.repeat(60))
        console.log('✨ Clean Interactive Planning Complete!\n')

        process.exit(0)

    } catch (error) {
        console.error('\n❌ Error:', error)
        await client.send(groupChatId, '❌ Sorry, something went wrong. Please try again.')
        process.exit(1)
    }
}

cleanInteractivePlanner().catch(console.error)
