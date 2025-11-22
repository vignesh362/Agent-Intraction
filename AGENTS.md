# AI Holiday Planner - LangChain Agents

An intelligent system using LangChain to plan perfect group outings with automatic cost calculations.

## 🤖 AI Agents

The system uses **4 specialized AI agents** that work together:

### 1. 📅 Calendar Agent
- Finds free time slots for all group members
- Can integrate with Google Calendar API
- Suggests optimal meeting times

### 2. 📍 Location Agent
- Recommends outing locations based on preferences
- Considers group size and budget
- Calculates location costs (entrance fees, parking, etc.)

### 3. 🍽️ Restaurant Agent
- Finds restaurants near the location
- Matches cuisine preferences
- Estimates meal costs per person

### 4. 🚗 Transportation Agent
- Suggests transportation options
- Compares costs (rideshare, rental, public transit)
- Calculates per-person transportation costs

## 🎯 Features

✅ **Automatic Cost Calculation** - Get cost per person for everything
✅ **Smart Recommendations** - AI suggests best options based on preferences
✅ **Multiple Options** - Get alternatives for each category
✅ **iMessage Integration** - Send plans directly to your group chat
✅ **Detailed Breakdown** - See exactly where money goes

## 🚀 Quick Start

### 1. Setup

```bash
# Copy the example env file
cp .env.example .env

# Add your OpenAI API key and group chat ID
# Edit .env and add:
# OPENAI_API_KEY=your-key-here
# GROUP_CHAT_ID=chat123...
```

### 2. Choose Your Mode

**Interactive Mode (Recommended)** - Asks group questions and waits for responses:
```bash
npm run plan-interactive
```

**Automatic Mode** - Generates plan instantly:
```bash
npm run plan-holiday
```

### 3. Customize Your Plan

Edit `examples/holiday-planner.ts`:

```typescript
const params = {
    city: 'San Francisco',
    participants: [
        'alice@example.com',
        'bob@example.com',
        'charlie@example.com'
    ],
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-15'),
    duration: 6, // hours
    preferences: {
        activities: ['outdoor', 'cultural'],
        cuisine: ['Italian', 'Mexican'],
        budget: 'medium'
    }
}
```

## 📊 Example Output

```
🎉 HOLIDAY PLAN COMPLETE!

📅 SCHEDULE
Date: 2025-12-07
Time: 10:00 - 16:00
Participants: 4 people

📍 LOCATION
Golden Gate Park
Type: Park
Activities: hiking, picnicking, photography
Cost per person: $15

🍽️ RESTAURANT
Mama's on Washington Square
Cuisine: Italian
Cost per person: $45

🚗 TRANSPORTATION
Rideshare (Uber XL)
Duration: 25 minutes
Cost per person: $12

💰 COST BREAKDOWN
Location & Activities: $15/person ($60 total)
Restaurant: $45/person ($180 total)
Transportation: $12/person ($48 total)

TOTAL PER PERSON: $72.00
TOTAL FOR GROUP: $288.00
```

## 🎯 Interactive Mode (NEW!)

The interactive planner has a conversational workflow:

### How It Works

```
STEP 0: 🔗 Calendar Connection (Optional)
├─ Bot sends link to group
├─ Waits for at least 50% to connect
└─ Proceeds once minimum threshold met

STEP 1: 📅 Calendar Analysis
└─ Finds free dates for everyone

STEP 2: 📍 Location Preferences
├─ Bot asks: "What kind of place?"
├─ ⏳ WAITS for all responses
└─ ✅ Confirms responses collected

STEP 3: 🍽️ Food Preferences
├─ Bot asks: "What food do you want?"
├─ ⏳ WAITS for all responses
└─ ✅ Confirms responses collected

STEP 4: 💰 Budget
├─ Bot asks: "What's your budget?"
├─ ⏳ WAITS for all responses
└─ ✅ Confirms responses collected

STEP 5: 🔧 Plan Generation
└─ Creates complete plan with costs

STEP 6: 📋 Potential Timeline
├─ Bot sends: "POTENTIAL TIMELINE"
├─ Shows complete plan with costs
├─ Bot asks: "Does this timeline work?"
└─ ⏳ WAITS for confirmation responses

STEP 7: ✅ Final Plan
└─ If approved → Sends confirmed plan
   If rejected → Asks what to change
```

### Example Conversation

```
Bot: 🔗 CALENDAR CONNECTION NEEDED
     Connect your calendar: http://localhost:3000?email=alice@example.com
     
     [Waits for at least 50% to connect...]

Bot: ✅ Minimum threshold reached!
     3/4 people connected. Proceeding...

Bot: 🎉 Found free time slots for everyone!
     1. 2025-12-07 (10:00 - 16:00)
     Let's plan something!

Bot: 📍 What kind of place would you like to visit?
     ⏳ Reply with your preference...

Alice: Beach or park
Bob: Somewhere outdoors
Charlie: Hiking trail
Diana: Outdoor space

Bot: ✅ Collected 4 location responses

Bot: 🍽️  What kind of food would you like?
     ⏳ Reply with your preference...

Alice: Italian
Bob: Italian or Mexican
Charlie: Any cuisine
Diana: Mexican

Bot: ✅ Collected 4 food responses

Bot: 💰 What's your budget per person?
     • LOW (under $50)
     • MEDIUM ($50-100)
     • HIGH ($100+)
     ⏳ Reply with your budget...

Alice: MEDIUM
Bob: MEDIUM
Charlie: $60 is good
Diana: MEDIUM

Bot: ✅ Collected 4 budget responses

Bot: ⏳ Great! Planning your perfect outing...

Bot: 📅 POTENTIAL TIMELINE
     
     Based on your preferences, here's the plan:
     
     📅 2025-12-07 at 10:00-16:00
     📍 Golden Gate Park - $15/person
     🍽️  Mama's Italian - $45/person  
     🚗 Uber XL - $12/person
     💰 TOTAL: $72/person
     
     ⏳ Please review and let us know if this works...

Bot: ✅ Does this timeline work for everyone?
     Reply YES to confirm or NO if you need changes.
     ⏳ Waiting for your responses...

Alice: Yes!
Bob: Yes 👍
Charlie: Looks perfect!
Diana: YES

Bot: ✅ Timeline approved by group!

Bot: 🎉 FINAL PLAN - CONFIRMED! ...
```

## 🔧 Advanced Usage

### Use Individual Agents

```typescript
import { LocationAgent } from './src/agents/location-agent.js'

const agent = new LocationAgent(process.env.OPENAI_API_KEY!)

const locations = await agent.findLocations({
    city: 'San Francisco',
    groupSize: 4,
    preferences: ['outdoor', 'scenic'],
    budget: 'medium'
})

console.log(locations)
```

### Google Calendar Integration

To use real calendar data:

1. Get Google Calendar API credentials
2. Add to `.env`:
```
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

3. Update the planner:
```typescript
const planner = new HolidayPlanner(
    openAIKey,
    googleCredentials
)
```

### Send to iMessage Group

```typescript
// In .env
SEND_TO_IMESSAGE=true
GROUP_CHAT_ID=chat123...

// The planner will automatically send the plan to your group
```

## 🏗️ Architecture

```
HolidayPlanner (Orchestrator)
    │
    ├── CalendarAgent → Find free time
    │
    ├── LocationAgent → Find location + costs
    │
    ├── RestaurantAgent → Find restaurant + costs
    │
    └── TransportationAgent → Find transport + costs
    
    → Calculate total cost per person
    → Generate summary
    → Format for iMessage
```

## 💡 Use Cases

- **Weekend Outings** - Plan group trips automatically
- **Team Building** - Find activities for work teams
- **Family Gatherings** - Coordinate family events
- **Friend Meetups** - Organize group hangouts
- **Tourist Groups** - Plan itineraries with costs

## 📝 Agent Details

### Calendar Agent
```typescript
const calendar = new CalendarAgent(openAIKey)

const freeTime = await calendar.findFreeTime(
    ['user1@email.com', 'user2@email.com'],
    new Date('2025-12-01'),
    new Date('2025-12-15'),
    4 // duration in hours
)
```

### Location Agent
```typescript
const location = new LocationAgent(openAIKey)

const recommendations = await location.findLocations({
    city: 'New York',
    groupSize: 5,
    preferences: ['museums', 'art'],
    budget: 'high'
})
```

### Restaurant Agent
```typescript
const restaurant = new RestaurantAgent(openAIKey)

const options = await restaurant.findRestaurants({
    location: 'Central Park',
    city: 'New York',
    groupSize: 5,
    cuisine: ['Italian', 'French'],
    budget: 'medium'
})
```

### Transportation Agent
```typescript
const transport = new TransportationAgent(openAIKey)

const options = await transport.findTransportation({
    from: 'Downtown',
    to: 'Golden Gate Park',
    city: 'San Francisco',
    groupSize: 4,
    budget: 'low'
})
```

## 🎨 Customization

### Adjust Budget Levels

```typescript
// Low: Focus on free/cheap options
preferences: { budget: 'low' }

// Medium: Balance of cost and quality
preferences: { budget: 'medium' }

// High: Premium options
preferences: { budget: 'high' }
```

### Activity Preferences

```typescript
preferences: {
    activities: [
        'outdoor',
        'cultural',
        'scenic',
        'adventure',
        'relaxing',
        'educational'
    ]
}
```

### Dietary Restrictions

```typescript
await restaurant.findRestaurants({
    // ... other params
    dietaryRestrictions: ['vegetarian', 'gluten-free']
})
```

## 🔍 Troubleshooting

**"OpenAI API key not found"**
- Make sure `.env` file exists with `OPENAI_API_KEY=...`

**"No free time slots found"**
- Expand your date range
- Consider using LLM-based suggestions instead of real calendar data

**Costs seem high/low**
- Adjust the `budget` parameter
- The AI will recalibrate estimates

## 📚 Tech Stack

- **LangChain** - AI agent framework
- **OpenAI GPT-4** - Language model
- **Google Calendar API** - Calendar integration (optional)
- **TypeScript** - Type safety
- **Zod** - Schema validation

## 🎯 Cost Estimates

The system provides realistic estimates including:
- ✅ Entrance fees
- ✅ Parking costs
- ✅ Meal costs (with tax and tip)
- ✅ Transportation (including gas/tolls)
- ✅ Activity costs
- ✅ Buffer for unexpected expenses

---

**Ready to plan your perfect outing? Run `npm run plan-holiday`!** 🎉
