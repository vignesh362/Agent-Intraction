# iMessage Client + AI Holiday Planner

A powerful TypeScript client for iMessages + AI-powered group outing planner using LangChain agents.

Built with [@photon-ai/imessage-kit](https://github.com/photon-ai/imessage-kit) and [LangChain](https://js.langchain.com/).

## ✨ Features

### iMessage Client
- 🚀 **Super Simple API** - Python-class-like interface
- 📱 **Send with one line** - `client.send(chatId, 'message')`
- 📤 **Text, images, and files** support
- 📦 **Batch sending** to multiple chats
- 🔍 **Easy group discovery** - Find groups by name
- 🎯 **Type-safe** with full TypeScript support

### 🤖 AI Holiday Planner (NEW!)
- 💬 **Interactive Mode** - Asks questions in iMessage, waits for responses
- 📅 **Calendar Agent** - Analyzes calendars, finds free dates
- 📍 **Location Agent** - Recommends perfect outing locations
- 🍽️ **Restaurant Agent** - Finds great restaurants nearby
- 🚗 **Transportation Agent** - Plans transportation options
- 💰 **Auto Cost Calculation** - Total per-person cost breakdown
- ✅ **Group Confirmation** - Waits for everyone to approve

## 🚀 Quick Start

### Prerequisites

- **macOS** (required)
- **Node.js** >= 18.0.0
- **Google Gemini API Key** (for AI agents - FREE!)
- **Full Disk Access** permission
- **Google Calendar OAuth** (optional, for real calendar access)

### Installation

```bash
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and add:
# - GEMINI_API_KEY (required - get from https://makersuite.google.com/app/apikey)
# - GROUP_CHAT_ID (run: npm run list-groups)
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (optional)
```

### 🔐 Optional: Google Calendar Setup

To connect real calendars (highly recommended for accurate planning):

1. Follow **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** for step-by-step instructions
2. Add OAuth credentials to `.env`
3. Test with: `npm run test-oauth`

**Without OAuth**: The planner will use AI to suggest dates based on typical availability.

### ⚠️ Grant Full Disk Access (One-time setup)

1. Open **System Settings → Privacy & Security → Full Disk Access**
2. Click **"+"** and add your terminal or IDE
3. **Restart** your terminal/IDE

Without this, the client can't access your iMessage database.

## 📖 Usage

### 🤖 Interactive AI Holiday Planner (Recommended!)

Have a conversation with your group to plan the perfect outing:

```bash
npm run plan-interactive
```

**What happens:**
1. 🔗 (Optional) Sends OAuth link → Everyone connects their calendars
2. 📅 Analyzes calendars → Finds when everyone is free
3. 💬 Asks "What kind of place?" → Waits for everyone to respond
4. 💬 Asks "What food?" → Waits for everyone to respond
5. 💬 Asks "What budget?" → Waits for everyone to respond
6. 🔧 Generates plan with **total cost per person**
7. ✅ Asks for confirmation before finalizing
8. 📱 Sends final plan to your iMessage group

**See [AGENTS.md](./AGENTS.md) for complete documentation.**

#### 🔐 With Google Calendar OAuth

If you've set up OAuth (see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)):

```
1. Bot sends: "Connect your calendar: http://localhost:3000?email=alice@example.com"
2. Alice clicks → Browser opens → Google authorization
3. Alice allows → "✅ Calendar Connected!"
4. Repeat for all participants
5. Planning begins with real calendar data
```

**Benefits**: 
- ✅ Uses actual free/busy data from Google Calendar
- ✅ Only reads availability (not event details)
- ✅ More accurate date recommendations

### 🤖 Automatic Mode

Generate a plan instantly without group interaction:

```bash
npm run plan-holiday
```

### 📱 Simple iMessage Sending

```typescript
import { IMessageClient } from './src/client.js'

const client = new IMessageClient()
await client.send('chat85598446218630183', 'Hello! 👋')
await client.close()
```

### Complete Examples

#### 1. Send Text Message

```typescript
import { IMessageClient } from './src/client.js'

const client = new IMessageClient()

// Send to a group chat
await client.send('chat85598446218630183', 'Hello everyone!')

// Send to a phone number
await client.send('+1234567890', 'Hi there!')

await client.close()
```

#### 2. Find and Send to Groups

```typescript
const client = new IMessageClient()

// List all groups
const groups = await client.listGroups()
console.log(groups)

// Find a specific group
const myGroup = await client.findGroup('Family')
if (myGroup) {
    await client.send(myGroup.chatId, 'Hello!')
}

await client.close()
```

#### 3. Send Images and Files

```typescript
const client = new IMessageClient()

// Send image
await client.sendImages('chat123...', '/path/to/photo.jpg', 'Check this out!')

// Send multiple images
await client.sendImages('chat123...', ['/path/1.jpg', '/path/2.jpg'])

// Send file
await client.sendFiles('chat123...', '/path/to/document.pdf')

await client.close()
```

#### 4. Send to Multiple Chats

```typescript
const client = new IMessageClient()

const chatIds = ['chat123...', 'chat456...', 'chat789...']
await client.sendToMultiple(chatIds, 'Broadcast message to all!')

await client.close()
```

### Run the Examples

```bash
# 🧪 Testing & Setup
npm run test-oauth         # Test Google Calendar OAuth setup
npm run list-groups        # List all your iMessage groups

# 🤖 AI Holiday Planner
npm run plan-interactive   # Interactive planning (recommended)
npm run plan-holiday       # Automatic planning

# 💬 Basic iMessage Examples
npm run demo               # See full demo
npm start                  # Quick start (minimal example)
npm run simple             # Simple send examples
npm run list               # List groups and send
```

## 🎯 API Reference

### IMessageClient

#### Constructor

```typescript
new IMessageClient(config?: IMessageConfig)
```

**Config options:**
- `debug?: boolean` - Enable debug logging (default: false)
- `maxConcurrent?: number` - Max concurrent sends (default: 5)
- `timeout?: number` - Script timeout in ms (default: 30000)

#### Methods

**`send(chatId: string, message: string | SendOptions): Promise<void>`**

Send a message to a chat.

```typescript
await client.send('chat123...', 'Hello!')
await client.send('chat123...', {
  text: 'Check this!',
  images: ['/path/to/image.jpg'],
  files: ['/path/to/file.pdf']
})
```

**`sendText(chatId: string, text: string): Promise<void>`**

Send a text message.

**`sendImages(chatId: string, images: string | string[], text?: string): Promise<void>`**

Send image(s) with optional text.

**`sendFiles(chatId: string, files: string | string[], text?: string): Promise<void>`**

Send file(s) with optional text.

**`sendToMultiple(chatIds: string[], message: string | SendOptions): Promise<void>`**

Send the same message to multiple chats.

**`listGroups(limit?: number): Promise<GroupInfo[]>`**

List all group chats (default limit: 1000).

**`findGroup(search: string): Promise<GroupInfo | null>`**

Find a group by name or chat ID.

**`getUnreadGroups(): Promise<GroupInfo[]>`**

Get groups with unread messages.

**`close(): Promise<void>`**

Clean up and close the client.

## 🏗️ Project Structure

```
.
├── src/
│   ├── client.ts           # Main IMessageClient class
│   └── index.ts            # Exports
├── examples/
│   ├── demo.ts             # Complete demo
│   ├── quick-start.ts      # Minimal example (3 lines!)
│   ├── simple-send.ts      # Simple sending examples
│   └── list-and-send.ts    # List groups and send
└── package.json
```

## 💡 Tips & Tricks

### Finding Your Chat IDs

First time? Run this to see all your groups:

```typescript
const client = new IMessageClient()
const groups = await client.listGroups()
groups.forEach(g => console.log(`${g.name}: ${g.chatId}`))
await client.close()
```

### Using with Different Configurations

```typescript
// Enable debug mode
const client = new IMessageClient({ debug: true })

// Increase timeout for slow connections
const client = new IMessageClient({ timeout: 60000 })

// Higher concurrency for batch sends
const client = new IMessageClient({ maxConcurrent: 10 })
```

### Storing Group IDs

Create a simple config file:

```typescript
// my-groups.ts
export const GROUPS = {
  family: 'chat45e2b868...',
  work: 'chat123abc456...',
  friends: 'chat987zyx654...'
}

// main.ts
import { GROUPS } from './my-groups.js'
await client.send(GROUPS.family, 'Hello!')
```

## 🐛 Troubleshooting

### "Permission denied" or "Cannot access database"

**Solution:** Grant Full Disk Access to your terminal/IDE (see setup instructions above).

### "Group not found"

**Solution:** Run `npm run list-groups` to see all available groups and their exact names.

### "Command not found: tsx"

**Solution:** Make sure you ran `npm install` to install all dependencies.

### Messages not sending

**Checklist:**
1. ✅ Full Disk Access granted
2. ✅ Messages app is running on your Mac
3. ✅ You're signed in to iMessage
4. ✅ ChatId is correct (copy from list-groups output)

### Auto-reply bot not responding

**Checklist:**
1. ✅ Bot is running (you should see "Watcher started successfully")
2. ✅ Message contains the keyword (case-insensitive)
3. ✅ Message is in a group chat (not a DM)
4. ✅ Check console for error messages

## 🔐 Security & Privacy

- This SDK reads from your **local** iMessage database
- **No data** is sent to external servers (except your webhook if configured)
- Network images are downloaded to temporary files and cleaned up automatically
- Always validate user input when building bots

## 📄 License

MIT

## 🙏 Credits

Built with [@photon-ai/imessage-kit](https://github.com/photon-ai/imessage-kit)

---

**Need help?** Open an issue or check the [iMessage Kit documentation](https://github.com/photon-ai/imessage-kit).
