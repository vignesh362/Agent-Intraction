import express from 'express'
import { google } from 'googleapis'
import { IMessageClient } from '../client.js'
import open from 'open'

export interface CalendarConnection {
    email: string
    accessToken: string
    refreshToken: string
    connectedAt: Date
}

/**
 * Google Calendar OAuth Manager
 * Handles OAuth flow for connecting participant calendars
 */
export class CalendarOAuthManager {
    private oauth2Client: any
    private connections: Map<string, CalendarConnection>
    private app: express.Application
    private server: any
    private imessageClient?: IMessageClient
    private groupChatId?: string
    private expectedParticipants?: string[]

    constructor(
        clientId: string,
        clientSecret: string,
        redirectUri: string = 'http://localhost:3000/oauth/callback'
    ) {
        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        )

        this.connections = new Map()
        this.app = express()
        this.setupRoutes()
    }

    /**
     * Setup express routes for OAuth flow
     */
    private setupRoutes() {
        // Landing page with participant dropdown
        this.app.get('/', (req, res) => {
            const participants = Array.from(this.expectedParticipants || [])
            const dropdownOptions = participants.map(email => 
                `<option value="${email}">${email}</option>`
            ).join('')

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Calendar Connection</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .container {
                            background: white;
                            padding: 3rem;
                            border-radius: 20px;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                            text-align: center;
                            max-width: 500px;
                        }
                        h1 { color: #333; margin-bottom: 1rem; }
                        p { color: #666; margin-bottom: 2rem; line-height: 1.6; }
                        select {
                            width: 100%;
                            padding: 1rem;
                            font-size: 1rem;
                            border: 2px solid #ddd;
                            border-radius: 10px;
                            margin-bottom: 1.5rem;
                            background: white;
                        }
                        .btn {
                            background: #667eea;
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            font-size: 1.1rem;
                            border-radius: 10px;
                            cursor: pointer;
                            width: 100%;
                            transition: transform 0.2s;
                        }
                        .btn:hover { transform: scale(1.02); }
                        .btn:disabled { 
                            background: #ccc; 
                            cursor: not-allowed; 
                            transform: none; 
                        }
                        .icon { font-size: 3rem; margin-bottom: 1rem; }
                    </style>
                    <script>
                        function connectCalendar() {
                            const email = document.getElementById('participantSelect').value;
                            if (!email) {
                                alert('Please select who you are');
                                return;
                            }
                            window.location.href = '/auth/google?email=' + encodeURIComponent(email);
                        }
                    </script>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">📅</div>
                        <h1>Connect Your Calendar</h1>
                        <p>First, select who you are from the dropdown:</p>
                        <select id="participantSelect">
                            <option value="">-- Select your name --</option>
                            ${dropdownOptions}
                        </select>
                        <button onclick="connectCalendar()" class="btn">Connect Google Calendar</button>
                        <p style="margin-top: 2rem; font-size: 0.9rem; color: #999;">
                            We only access your calendar availability, not event details.
                        </p>
                    </div>
                </body>
                </html>
            `)
        })

        // Start OAuth flow with email parameter
        this.app.get('/auth/google', (req, res) => {
            const email = req.query.email as string
            if (!email) {
                res.send(this.errorPage('Please select who you are from the dropdown'))
                return
            }

            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/calendar.readonly',
                    'https://www.googleapis.com/auth/userinfo.email'
                ],
                prompt: 'consent',
                state: email // Pass email through OAuth flow
            })
            res.redirect(authUrl)
        })

        // OAuth callback
        this.app.get('/oauth/callback', async (req, res) => {
            const code = req.query.code as string
            const selectedEmail = req.query.state as string // Get email from state parameter

            if (!code) {
                res.send(this.errorPage('No authorization code received'))
                return
            }

            if (!selectedEmail) {
                res.send(this.errorPage('No participant selected'))
                return
            }

            try {
                const { tokens } = await this.oauth2Client.getToken(code)
                this.oauth2Client.setCredentials(tokens)

                // Use the selected email from dropdown (not from Google)
                const email = selectedEmail

                // Store connection
                this.connections.set(email, {
                    email,
                    accessToken: tokens.access_token!,
                    refreshToken: tokens.refresh_token!,
                    connectedAt: new Date()
                })

                console.log(`✅ Calendar connected: ${email}`)

                // Notify group if configured
                if (this.imessageClient && this.groupChatId) {
                    await this.imessageClient.send(
                        this.groupChatId,
                        `✅ ${email} connected their calendar! (${this.connections.size} connected)`
                    )
                }

                res.send(this.successPage(email))

            } catch (error) {
                console.error('OAuth error:', error)
                res.send(this.errorPage('Failed to connect calendar'))
            }
        })

        // Status page
        this.app.get('/status', (req, res) => {
            const connections = Array.from(this.connections.values())
            res.json({
                totalConnections: connections.length,
                connections: connections.map(c => ({
                    email: c.email,
                    connectedAt: c.connectedAt
                }))
            })
        })
    }

    private successPage(email: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Calendar Connected!</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                    }
                    .container {
                        background: white;
                        padding: 3rem;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 500px;
                    }
                    h1 { color: #11998e; margin-bottom: 1rem; }
                    p { color: #666; line-height: 1.6; }
                    .icon { font-size: 4rem; margin-bottom: 1rem; }
                    .email { 
                        background: #f0f0f0;
                        padding: 0.5rem 1rem;
                        border-radius: 5px;
                        margin: 1rem 0;
                        font-family: monospace;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">✅</div>
                    <h1>Calendar Connected!</h1>
                    <p>Successfully connected calendar for:</p>
                    <div class="email">${email}</div>
                    <p style="margin-top: 2rem; color: #999;">
                        You can close this window now.
                    </p>
                </div>
            </body>
            </html>
        `
    }

    private errorPage(message: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Connection Error</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
                    }
                    .container {
                        background: white;
                        padding: 3rem;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 500px;
                    }
                    h1 { color: #eb3349; margin-bottom: 1rem; }
                    .icon { font-size: 4rem; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">❌</div>
                    <h1>Connection Failed</h1>
                    <p>${message}</p>
                    <p style="margin-top: 2rem;">
                        <a href="/" style="color: #eb3349;">Try again</a>
                    </p>
                </div>
            </body>
            </html>
        `
    }

    /**
     * Start the OAuth server
     */
    async startServer(port: number = 3000): Promise<string> {
        return new Promise((resolve) => {
            this.server = this.app.listen(port, () => {
                const url = `http://localhost:${port}`
                console.log(`\n🔐 OAuth server started at ${url}`)
                resolve(url)
            })
        })
    }

    /**
     * Stop the OAuth server
     */
    async stopServer(): Promise<void> {
        if (this.server) {
            this.server.close()
            console.log('🛑 OAuth server stopped')
        }
    }

    /**
     * Send connection link to iMessage group
     */
    async sendConnectionLinkToGroup(
        groupChatId: string,
        imessageClient: IMessageClient
    ): Promise<void> {
        this.imessageClient = imessageClient
        this.groupChatId = groupChatId

        const serverUrl = await this.startServer()
        
        const message = `📅 CALENDAR CONNECTION NEEDED\n\n` +
            `To find the best time for everyone, please connect your calendar:\n\n` +
            `👉 ${serverUrl}\n\n` +
            `Click the link above to connect your Google Calendar.\n` +
            `We only check availability, not event details. 🔒`

        await imessageClient.send(groupChatId, message)
        console.log(`\n📤 Connection link sent to group!`)
        console.log(`   Waiting for participants to connect...\n`)
    }

    /**
     * Wait for participants to connect (at least minimum threshold)
     */
    async waitForConnections(
        expectedEmails: string[],
        timeout: number = 600000, // 10 minutes
        minThreshold: number = 0.5 // 50% minimum
    ): Promise<Map<string, CalendarConnection>> {
        // Store expected participants for dropdown
        this.expectedParticipants = expectedEmails
        
        const startTime = Date.now()
        const minRequired = Math.ceil(expectedEmails.length * minThreshold)
        
        console.log(`⏳ Waiting for at least ${minRequired}/${expectedEmails.length} people to connect...`)
        expectedEmails.forEach(email => console.log(`   - ${email}`))

        while (true) {
            const connected = expectedEmails.filter(email => 
                this.connections.has(email)
            )

            process.stdout.write(`\r   ${connected.length}/${expectedEmails.length} connected (need ${minRequired})   `)

            if (connected.length >= minRequired) {
                console.log('\n✅ Minimum threshold reached!\n')
                if (connected.length < expectedEmails.length) {
                    console.log(`⚠️  Note: ${expectedEmails.length - connected.length} people haven't connected yet`)
                    console.log('   Proceeding with available calendar data...\n')
                }
                break
            }

            if (Date.now() - startTime > timeout) {
                console.log(`\n⚠️  Timeout: Only ${connected.length}/${expectedEmails.length} connected (needed ${minRequired})`)
                if (connected.length > 0) {
                    console.log('   Proceeding with partial calendar data...\n')
                } else {
                    console.log('   Will use AI suggestions instead...\n')
                }
                break
            }

            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        return this.connections
    }

    /**
     * Get all connected calendars
     */
    getConnections(): Map<string, CalendarConnection> {
        return this.connections
    }

    /**
     * Get auth client for a specific user
     */
    getAuthClientForUser(email: string): any {
        const connection = this.connections.get(email)
        if (!connection) return null

        const client = new google.auth.OAuth2()
        client.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken
        })
        return client
    }

    /**
     * Open browser for testing
     */
    async openBrowser(url: string): Promise<void> {
        await open(url)
    }
}
