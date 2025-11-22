# Serpapi Integration Setup (Google Maps + Flights)

## 🎯 One API for Everything

Serpapi provides access to **both** Google Maps data AND Google Flights data with a single API key!

### Benefits:
- ✅ Real-time distance calculations (Google Maps)
- ✅ Accurate travel durations with traffic data
- ✅ Real flight prices and schedules (Google Flights)
- ✅ Multiple airlines and routes
- ✅ No need for multiple API keys
- ✅ Easy setup - just one API key!

---

## 🚀 Setup (2 Minutes)

### Serpapi (Recommended - Powers Everything)

**What You Get:**
- ✅ Google Maps directions and distances
- ✅ Real-time travel durations
- ✅ Google Flights prices and schedules
- ✅ Multiple airlines and routes
- ✅ All from ONE API key

**Setup Steps:**

1. **Sign up for Serpapi:**
   https://serpapi.com/users/sign_up

2. **Get your API key:**
   - Go to: https://serpapi.com/manage-api-key
   - Copy your API key

3. **Add to .env:**
   ```
   SERPAPI_KEY=YOUR_SERPAPI_KEY_HERE
   ```

**Pricing:**
- **Free Tier:** 100 searches/month (perfect for testing!)
- **Paid Plans:** 
  - $50/month for 5,000 searches
  - $75/month for 10,000 searches
  - $250/month for 50,000 searches

---

## 🆓 Without Serpapi (Free Alternative)

If you don't add Serpapi, the system will:
- ✅ Use AI to suggest realistic options
- ✅ Generate Google Maps/Flights search URLs
- ✅ Provide typical pricing estimates
- ⚠️ Won't have real-time data

---

## 📊 What You Get

### ✅ With Serpapi:
```
🗺️  Serpapi: 12.5 mi, 25 mins (real Google Maps data)
Transportation:
- Uber XL: $18/person (based on 12.5 mi)
- Public Transit: $2.50/person (25 mins)

✈️  Real Flight Data:
- United Airlines UA1234: $245/person
- Delta DL5678: $267/person
- Southwest WN9012: $198/person
```

### ⚠️ Without Serpapi:
```
Using AI estimates
Transportation:
- Uber XL: $15-20/person (estimated)
- Public Transit: $2-5/person (estimated)

Flight Suggestions:
- Typical airlines for this route
- Estimated prices based on distance
- Google Flights search link provided
```

---

## 💰 Cost Comparison

| Setup | Free Tier | Paid Pricing | Data Quality |
|-------|-----------|--------------|--------------|
| **With Serpapi** | 100 searches/month | $50/month for 5,000 | Real-time, accurate |
| **Without Serpapi** | Unlimited | Free | AI estimates |

---

## 🚀 Quick Start (No API Required)

Don't want to set up Serpapi yet? No problem!

1. Leave `SERPAPI_KEY` empty in `.env`
2. Run the planner: `npm start`
3. You'll get AI-based estimates with search links

When you're ready for real data, just add the Serpapi key!

---

## 📝 Environment Variables Summary

```bash
# Required
GEMINI_API_KEY=your_gemini_key
GROUP_CHAT_ID=your_chat_id

# Optional (Provides Real Data)
SERPAPI_KEY=your_serpapi_key  # One key for Maps + Flights!

# Calendar Integration (Optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

## 🎯 Why Serpapi?

**Before (Multiple APIs needed):**
- Google Maps API → Distances
- Google Flights API → Not available!
- Amadeus API → Flights (complex setup)
- **Total:** Multiple keys, complex setup

**Now (One API):**
- Serpapi → Google Maps data
- Serpapi → Google Flights data
- **Total:** ONE key, simple setup ✨

**Bonus:** Serpapi also provides access to:
- Google Shopping (for gear/supplies)
- Google Hotels (for accommodations)
- Yelp (for restaurant details)
- And 100+ other data sources!
