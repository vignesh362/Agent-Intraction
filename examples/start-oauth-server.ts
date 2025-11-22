/**
 * Start OAuth Server (keeps running)
 */

import 'dotenv/config'
import { CalendarOAuthManager } from '../src/agents/calendar-oauth.js'

async function startOAuthServer() {
    console.log('🔐 Starting OAuth Server...\n')

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('❌ OAuth credentials not configured!\n')
        console.log('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env')
        process.exit(1)
    }

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

    const port = parseInt(process.env.OAUTH_PORT || '3000')
    
    try {
        await oauthManager.startServer(port)
        console.log(`✅ OAuth server running at http://localhost:${port}\n`)
        console.log('Press Ctrl+C to stop\n')
        
        // Keep the process alive
        process.on('SIGINT', () => {
            console.log('\n\n👋 Stopping OAuth server...')
            oauthManager.stopServer()
            process.exit(0)
        })
        
    } catch (error) {
        console.error('❌ Error starting server:', error)
        process.exit(1)
    }
}

startOAuthServer()
