# 🎯 Clean Interactive Holiday Planner

A step-by-step interactive AI planner that waits for user input at each stage to create the perfect group outing.

## 🌟 What's Different?

This is a **clean, user-friendly version** that:
- ✅ Waits for user input at EVERY stage
- ✅ Shows multiple options to choose from
- ✅ Checks weather before suggesting places
- ✅ Gets Reddit insider tips for chosen location
- ✅ Provides complete budget breakdown per person
- ✅ Plans round-trip transportation
- ✅ Beautiful formatted timeline

## 🔄 Complete Flow

```
┌─────────────────────────────────────────┐
│ STEP 1: Calendar Integration (Optional) │
│ • Ask users to connect calendars        │
│ • Wait 30 seconds for connections       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 2: Show Multiple Dates             │
│ • Present 3 date options                │
│ • ⏳ WAIT for user to choose date       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 3: Check Weather/Climate           │
│ • Get forecast for chosen date          │
│ • Show temperature, conditions          │
│ • Give weather-appropriate suggestions  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 4: Suggest Places                  │
│ • Ask activity type preference          │
│ • ⏳ WAIT for user response             │
│ • Find locations matching weather       │
│ • Show top 3 options with details       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 5: Choose Location                 │
│ • ⏳ WAIT for location choice           │
│ • Confirm chosen location               │
│ • Get Reddit insider tips               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 6: Show Restaurant Options         │
│ • Ask cuisine preference                │
│ • ⏳ WAIT for cuisine choice            │
│ • Ask budget level                      │
│ • ⏳ WAIT for budget                    │
│ • Find restaurants near location        │
│ • Show top 3 options                    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 7: Choose Restaurant               │
│ • ⏳ WAIT for restaurant choice         │
│ • Confirm chosen restaurant             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 8: Plan Transportation             │
│ • Calculate route TO location           │
│ • Calculate route FROM location         │
│ • Show both options with costs          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 9: Complete Timeline               │
│ • Date & time                           │
│ • Weather forecast                      │
│ • Outbound transportation               │
│ • Location with activities              │
│ • Reddit insider tips                   │
│ • Restaurant details                    │
│ • Return transportation                 │
│ • COMPLETE budget per person            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ STEP 10: Final Confirmation             │
│ • ⏳ WAIT for YES/NO confirmation       │
│ • Send confirmed plan or ask changes    │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Run the Planner

```bash
npm run clean-plan
```

### 2. What Happens

The bot will guide your group through each step, **waiting for responses** at:
- Date selection (3 options)
- Activity type preference
- Location choice (3 options)
- Cuisine preference
- Budget level
- Restaurant choice (3 options)
- Final confirmation

## 📋 Example Output

```
╔════════════════════════════════════════╗
║     🎉 YOUR COMPLETE OUTING PLAN      ║
╚════════════════════════════════════════╝

📅 DATE & TIME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📆 2025-11-29 (This Saturday)
⏰ 10:00 AM - 4:00 PM
👥 4 people

🌤️  WEATHER FORECAST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Partly Cloudy
🌡️  Temperature: 12°C - 18°C
💧 Humidity: 65%
💡 Perfect weather for outdoor activities!

🚗 OUTBOUND TRANSPORTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: Downtown San Francisco
To: Golden Gate Park
Method: Uber XL
Duration: 25 minutes
💰 Cost: $15/person

📍 MAIN LOCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Golden Gate Park
📍 501 Stanyan St, San Francisco
🎪 Activities: hiking, picnicking, photography, biking
💰 Entry Fee: $0/person

📱 REDDIT INSIDER TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Best parking is near Japanese Tea Garden
• Visit the botanical gardens - they're free!
• Pack a picnic, food vendors are expensive

🍽️  RESTAURANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍴 Mama's on Washington Square
🌮 Cuisine: Italian
⭐ Rating: 4.5/5
💰 Cost: $45/person

🚗 RETURN TRANSPORTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: Golden Gate Park
To: Downtown San Francisco
Method: Uber XL
Duration: 25 minutes
💰 Cost: $15/person

💰 COMPLETE COST BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚗 Outbound Transport:  $15.00/person
📍 Location & Entry:    $0.00/person
🍽️  Restaurant & Food:  $45.00/person
🚗 Return Transport:    $15.00/person
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL PER PERSON:    $75.00
💰 TOTAL FOR GROUP:     $300.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🎯 Key Features

### 1. Multiple Date Options
- Shows 3 upcoming Saturdays
- Users vote on preferred date
- Clear labels (This Saturday, Next Saturday, etc.)

### 2. Weather-Based Suggestions
- Real weather forecast for chosen date
- Temperature, humidity, precipitation
- Activity recommendations based on conditions

### 3. Location Selection with Options
- 3 location choices presented
- Full details: address, activities, cost
- Based on weather and user preferences

### 4. Reddit Insider Tips
- Real tips from Reddit for chosen location
- Local knowledge and hidden gems
- Best times, parking, things to avoid

### 5. Restaurant Options
- 3 restaurant choices near location
- Filtered by cuisine preference
- Budget-appropriate options
- Ratings and cost per person

### 6. Complete Transportation
- **Outbound**: Getting TO the location
- **Return**: Getting back FROM location
- Method, duration, and cost for each
- Budget-appropriate options

### 7. Complete Budget Breakdown
```
🚗 Outbound Transport:  $15.00/person
📍 Location & Entry:    $10.00/person
🍽️  Restaurant & Food:  $45.00/person
🚗 Return Transport:    $15.00/person
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 TOTAL PER PERSON:    $85.00
💰 TOTAL FOR GROUP:     $340.00
```

## ⏱️ Timeouts

- Calendar integration: 30 seconds
- Date choice: 3 minutes
- Activity preference: 3 minutes
- Location choice: 3 minutes
- Cuisine preference: 3 minutes
- Budget: 3 minutes
- Restaurant choice: 3 minutes
- Final confirmation: 5 minutes

## 🔧 Configuration

Edit the planner constants in `clean-interactive-planner.ts`:

```typescript
const city = 'San Francisco'  // Change to your city
const participants = ['user1', 'user2', 'user3', 'user4']
```

## 📱 Required Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key
GROUP_CHAT_ID=chat123...

# Optional (for enhanced features)
SERPAPI_KEY=your-serpapi-key  # For better maps/transportation
```

## 🆚 Comparison: Clean Planner vs Simple Trial

| Feature | Simple Trial | Clean Planner |
|---------|-------------|---------------|
| Date Selection | Auto (next Saturday) | 3 options to choose |
| Weather Check | ✅ Shows | ✅ Shows + suggests activities |
| Location Options | 1 auto-selected | 3 to choose from |
| Reddit Tips | ✅ Included | ✅ Included |
| Restaurant Options | 1 auto-selected | 3 to choose from |
| Budget Input | Single question | Separate for food |
| Transportation | Round-trip ✅ | Round-trip ✅ |
| Wait Times | Minimal | At every step |
| User Control | Low | High |

## 🎨 Customization

### Change Number of Options

```typescript
// Show 5 date options instead of 3
for (let i = 1; i <= 5; i++) {
    // ... date generation
}

// Show 5 location options
const locationList = Array.isArray(locations) ? locations.slice(0, 5) : [locations]
```

### Adjust Timeouts

```typescript
// Longer timeout for date choice (5 minutes instead of 3)
const dateChoices = await interactive.askGroupQuestion(
    `Waiting for date choice...`,
    300000 // 5 minutes
)
```

### Change Default City

```typescript
const city = 'New York'  // or 'Los Angeles', 'Chicago', etc.
```

## 🚨 Error Handling

The planner handles:
- ✅ No responses (uses sensible defaults)
- ✅ Invalid choices (uses first option)
- ✅ Timeouts (continues with defaults)
- ✅ API failures (graceful fallbacks)

## 🎯 Best Practices

1. **Run during active hours** - Users need to respond
2. **Have backup plans** - Bot continues with defaults if no response
3. **Test first** - Try with a small test group
4. **Monitor console** - Shows real-time progress
5. **Check env vars** - Ensure all API keys are set

## 🔍 Troubleshooting

**No responses received?**
- Check group chat ID is correct
- Ensure iMessage is running
- Verify participants can receive messages

**Weather not showing?**
- Weather API might be rate-limited
- Will show generic forecast if API fails

**Transportation costs seem high/low?**
- With SERPAPI_KEY: Real Google Maps data
- Without: AI estimates (less accurate)

**Reddit tips not showing?**
- Some locations might not have Reddit posts
- Bot will show generic tips

## 📚 Learn More

- See `AGENTS.md` for agent architecture
- See `README.md` for setup instructions
- See `examples/simple-trial.ts` for simpler version

---

**Ready to plan your perfect outing? Run `npm run clean-plan`!** 🎉
