/**
 * Test Calendar OAuth Integration
 * This will send OAuth links to your group chat for calendar access
 */

import 'dotenv/config'
import { IMessageClient } from '../src/client.js'
import { CalendarOAuthManager } from '../src/agents/calendar-oauth.js'

async function testCalendarOAuth() {
    console.log('🔐 Testing Calendar OAuth Integration\n')

    // Check if OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('❌ OAuth credentials not configured!\n')
        console.log('📋 To enable calendar integration:\n')
        console.log('1. Go to: https://console.cloud.google.com/apis/credentials')
        console.log('2. Create a new OAuth 2.0 Client ID')
        console.log('3. Application type: Web application')
        console.log('4. Authorized redirect URIs: http://localhost:3000/oauth/callback')
        console.log('5. Copy Client ID and Client Secret to .env file\n')
        console.log('For now, testing with simulated OAuth flow...\n')
        
        // Test without real OAuth - just send a demo message
        await testWithoutOAuth()
        return
    }

    // Real OAuth test
    const groupChatId = process.env.GROUP_CHAT_ID!
    const participants = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com'
    ]

    const oauthManager = new CalendarOAuthManager(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
    )

    try {
        // Start OAuth server
        const port = parseInt(process.env.OAUTH_PORT || '3000')
        console.log(`🚀 Starting OAuth server on port ${port}...`)
        await oauthManager.startServer(port)
        console.log(`✅ OAuth server running!\n`)

        // Send single OAuth link to group chat
        const client = new IMessageClient()
        
        console.log('📤 Sending calendar connection link to group...\n')
        
        // Use ngrok URL if provided, otherwise localhost
        const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`
        
        await client.send(
            groupChatId,
            `🔗 CALENDAR CONNECTION NEEDED\n\n` +
            `To help plan the perfect date for everyone, please connect your Google Calendar.\n\n` +
            `👉 ${publicUrl}\n\n` +
            `Click the link above, select your name from the dropdown, and authorize access.\n\n` +
            `⏳ Waiting for at least 50% of people to connect...`
        )

        console.log('✅ OAuth links sent to group!\n')
        console.log('⏳ Waiting for connections (minimum 2/4)...\n')

        // Wait for connections with 50% threshold
        const connected = await oauthManager.waitForConnections(
            participants,
            300000, // 5 minutes
            0.5 // 50% minimum
        )

        if (connected) {
            console.log('✅ Calendar integration successful!')
            
            await client.send(
                groupChatId,
                `✅ Enough people connected! Now analyzing calendars to find free time...`
            )

            // Get connections
            const connections = oauthManager.getConnections()
            console.log(`\n📊 Connected users: ${connections.size}`)
            for (const [email, conn] of connections) {
                console.log(`   ✓ ${email} - Connected at ${conn.connectedAt.toLocaleTimeString()}`)
            }
        } else {
            console.log('⚠️  Minimum threshold not reached, will use AI-based suggestions')
            
            await client.send(
                groupChatId,
                `⚠️  Not enough calendar connections. Will use AI to suggest dates instead.`
            )
        }

        // Stop server
        oauthManager.stopServer()
        console.log('\n✅ Test completed!')
        process.exit(0)

    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

async function testWithoutOAuth() {
    console.log('📱 Testing message flow without real OAuth...\n')
    
    const client = new IMessageClient()
    const groupChatId = process.env.GROUP_CHAT_ID!
    
    await client.send(
        groupChatId,
        `🔗 CALENDAR CONNECTION TEST\n\n` +
        `This is how the OAuth flow would work:\n\n` +
        `1. You'd receive personalized links\n` +
        `2. Click to authorize Google Calendar access\n` +
        `3. Bot waits for 50% to connect\n` +
        `4. Then analyzes calendars for free time\n\n` +
        `To enable: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env`
    )
    
    console.log('✅ Test message sent!\n')
    console.log('📋 Next steps to enable real OAuth:\n')
    console.log('1. Visit: https://console.cloud.google.com/apis/credentials')
    console.log('2. Create OAuth 2.0 Client ID')
    console.log('3. Add credentials to .env file')
    console.log('4. Run this test again\n')
}

testCalendarOAuth().catch(console.error)
