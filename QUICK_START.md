# 🚀 Quick Start Guide - Clean Interactive Planner

## Run It Now

```bash
npm run clean-plan
```

## What Happens

The bot asks your group to make choices at each step:

### 1. Date (3 options) → ⏳ Wait
```
1. 2025-11-29 (This Saturday)
2. 2025-12-06 (Next Saturday)  
3. 2025-12-13 (In 2 Saturdays)
```

### 2. Weather → Shows automatically
```
🌤️ Partly Cloudy
🌡️ 12°C - 18°C
```

### 3. Activity Type → ⏳ Wait
```
Outdoor? Indoor? Mixed? Adventure?
```

### 4. Location (3 options) → ⏳ Wait
```
1. Golden Gate Park - $0/person
2. Exploratorium - $30/person
3. Lands End Trail - $0/person
```

### 5. Reddit Tips → Shows automatically
```
• Best parking near Tea Garden
• Visit botanical gardens - free!
• Pack a picnic
```

### 6. Cuisine → ⏳ Wait
```
Italian? Mexican? Chinese? Japanese?
```

### 7. Budget → ⏳ Wait
```
LOW ($15-30)
MEDIUM ($30-60)
HIGH ($60+)
```

### 8. Restaurant (3 options) → ⏳ Wait
```
1. Mama's - Italian - $45/person
2. Tony's Pizza - Italian - $35/person
3. A16 - Italian - $50/person
```

### 9. Complete Timeline → Shows automatically
```
╔═══════════════════════════════╗
║  YOUR COMPLETE OUTING PLAN   ║
╚═══════════════════════════════╝

📅 2025-11-29 at 10:00-16:00
🌤️ Weather: Partly Cloudy, 12-18°C

🚗 TO Location: Uber XL - $15/person
📍 Golden Gate Park - $0/person
📱 Reddit Tips: [3 tips shown]
🍽️ Mama's Italian - $45/person
🚗 FROM Location: Uber XL - $15/person

💰 TOTAL: $75/person ($300 group)
```

### 10. Confirmation → ⏳ Wait
```
Does this work? YES or NO?
```

## 🎯 7 User Input Points

| Step | Input | Time |
|------|-------|------|
| 2 | Date choice | 3 min |
| 4 | Activity type | 3 min |
| 5 | Location choice | 3 min |
| 6 | Cuisine | 3 min |
| 7 | Budget | 3 min |
| 8 | Restaurant choice | 3 min |
| 10 | YES/NO | 5 min |

## 💰 What You Get

✅ Complete timeline
✅ Weather forecast
✅ Reddit insider tips
✅ Round-trip transportation
✅ Cost per person breakdown
✅ Total for group

## 📋 Requirements

```bash
# In .env file:
GEMINI_API_KEY=your-key
GROUP_CHAT_ID=chat123...
```

## 🎨 Customize

Edit `examples/clean-interactive-planner.ts`:

```typescript
const city = 'San Francisco'  // Change city
const participants = ['user1', 'user2', 'user3', 'user4']
```

## 📚 More Info

- `CLEAN_PLANNER.md` - Full guide
- `FLOW_DIAGRAM.md` - Visual flow
- `IMPLEMENTATION_SUMMARY.md` - Technical details

---

**That's it! Run `npm run clean-plan` and follow along!** 🎉
