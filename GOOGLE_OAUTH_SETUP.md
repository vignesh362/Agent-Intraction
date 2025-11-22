# 🔐 Google Calendar OAuth Setup Guide

Complete guide to set up Google Calendar API with OAuth for the AI Holiday Planner.

## 📋 Prerequisites

- Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- 10 minutes of setup time

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** (top bar)
3. Click **"NEW PROJECT"**
4. Enter project name: `AI-Holiday-Planner`
5. Click **"CREATE"**
6. Wait for the project to be created (~30 seconds)

### Step 2: Enable Google Calendar API

1. Make sure your new project is selected (top bar)
2. Go to **"APIs & Services"** → **"Library"**
   - Or visit: https://console.cloud.google.com/apis/library
3. Search for **"Google Calendar API"**
4. Click on **"Google Calendar API"**
5. Click **"ENABLE"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
   - Or visit: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** user type
3. Click **"CREATE"**
4. Fill in the required fields:
   - **App name**: `AI Holiday Planner`
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"SAVE AND CONTINUE"**
6. **Scopes screen**: Click **"ADD OR REMOVE SCOPES"**
   - Search for `calendar.readonly`
   - Check: `https://www.googleapis.com/auth/calendar.readonly`
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**
7. **Test users screen**: Click **"ADD USERS"**
   - Add email addresses of all participants who will use the planner
   - Click **"ADD"**
   - Click **"SAVE AND CONTINUE"**
8. Review and click **"BACK TO DASHBOARD"**

### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
   - Or visit: https://console.cloud.google.com/apis/credentials
2. Click **"CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Fill in the fields:
   - **Name**: `Holiday Planner Client`
   - **Authorized redirect URIs**: Click **"ADD URI"**
     - Enter: `http://localhost:3000/oauth/callback`
5. Click **"CREATE"**
6. A popup will show your credentials:
   - Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - Copy the **Client secret** (looks like: `GOCSPX-xxxxx`)
7. Click **"OK"**

---

## ⚙️ Configure Your Project

### Update .env File

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-key-here

# Google Calendar OAuth Credentials (required for calendar features)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# OAuth Callback URL (default: http://localhost:3000)
OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback

# iMessage Group Chat ID (get from examples/list-groups.ts)
GROUP_CHAT_ID=chat123...

# Optional: Send plans directly to iMessage
SEND_TO_IMESSAGE=true

# Optional: OAuth Server Port
OAUTH_PORT=3000
```

### Example .env File

```bash
# Required
OPENAI_API_KEY=sk-proj-abc123def456...
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456...

# iMessage
GROUP_CHAT_ID=chat987654321
SEND_TO_IMESSAGE=true

# OAuth (default values)
OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback
OAUTH_PORT=3000
```

---

## 🧪 Test Your Setup

### 1. Test OAuth Flow

```bash
npm run test-oauth
```

This will:
1. Start the OAuth server on port 3000
2. Open your browser to authorize
3. Save your calendar tokens
4. Show your upcoming calendar events

### 2. Test Full Interactive Planner

```bash
npm run plan-interactive
```

This will:
1. Send OAuth link to your iMessage group
2. Wait for all participants to authorize
3. Start the interactive planning workflow

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Make sure **Authorized redirect URIs** includes:
   - `http://localhost:3000/oauth/callback`
4. If you changed the port in `.env`, update the URI accordingly

### Error: "invalid_client"

**Problem**: Client ID or Client Secret is incorrect.

**Solution**:
1. Double-check your `.env` file
2. Ensure no extra spaces or quotes around the credentials
3. Try regenerating credentials in Google Cloud Console

### Error: "Access blocked: This app's request is invalid"

**Problem**: OAuth consent screen not properly configured.

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Make sure you added the Calendar API scope
3. Add yourself as a test user
4. Save the consent screen

### Error: "Requested client not found"

**Problem**: Wrong Client ID format.

**Solution**:
- Client ID should look like: `123456789-abc.apps.googleusercontent.com`
- Not the numeric ID, not the project ID

### Participants Can't Authorize

**Problem**: Users see "This app hasn't been verified" error.

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Click **"ADD USERS"** under Test users
3. Add their email addresses
4. Tell them to click **"Advanced"** → **"Go to AI Holiday Planner (unsafe)"**
5. (For production, you'd need to verify the app with Google)

---

## 📱 How OAuth Works in the Planner

### Flow Overview

```
1. Bot sends iMessage to group:
   "Connect your calendar: http://localhost:3000?email=alice@example.com"

2. Alice clicks link → Browser opens

3. Landing page shows:
   "Connect Calendar" button

4. Alice clicks button → Redirected to Google OAuth

5. Google asks: "Allow AI Holiday Planner to view your calendar?"

6. Alice clicks "Allow"

7. Google redirects back: http://localhost:3000/oauth/callback?code=...

8. Bot exchanges code for tokens

9. Bot shows success page: "✅ Calendar Connected!"

10. Bot sends iMessage: "Alice's calendar connected!"

11. Repeat for all participants

12. Once everyone connected → Planning begins
```

### What Permissions Are Requested?

- **`calendar.readonly`**: View calendar events (read-only)
- **No write access**: The bot cannot modify your calendar

### Token Storage

Tokens are stored in memory during the session:
- Access token (1 hour expiration)
- Refresh token (used to get new access tokens)
- User email (identifier)

**Note**: Tokens are NOT saved to disk by default. For production, implement secure token storage.

---

## 🔒 Security Best Practices

### For Development

✅ Keep `.env` file private (already in .gitignore)
✅ Use test users only (OAuth consent screen)
✅ Run on localhost only
✅ Don't commit credentials to git

### For Production (Future)

- Store tokens in encrypted database
- Use secure session management
- Implement token rotation
- Get OAuth app verified by Google
- Use HTTPS with valid SSL certificate
- Add rate limiting to OAuth endpoints
- Implement user authentication

---

## 🎯 Verification Checklist

Before running the planner, verify:

- [ ] Google Cloud project created
- [ ] Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Calendar API scope added
- [ ] Test users added (all participants)
- [ ] OAuth credentials created
- [ ] Redirect URI matches (`http://localhost:3000/oauth/callback`)
- [ ] `.env` file updated with Client ID and Secret
- [ ] `OPENAI_API_KEY` set in `.env`
- [ ] `GROUP_CHAT_ID` set in `.env`

---

## 🆘 Need Help?

### Common Issues

1. **"Unauthorized" errors**: Check OpenAI API key
2. **"Redirect mismatch"**: Verify OAuth redirect URI
3. **"Access denied"**: Add user as test user in OAuth consent screen
4. **"Calendar not found"**: Ensure Calendar API is enabled

### Resources

- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

### Still Stuck?

Check the example output when running:
```bash
npm run test-oauth
```

This will show detailed error messages and help diagnose the issue.

---

**Ready to plan holidays? 🎉**

Run `npm run plan-interactive` and let the AI do the work!
