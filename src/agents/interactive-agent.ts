import { IMessageSDK } from '@photon-ai/imessage-kit'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { IMessageClient } from '../client.js'

export interface GroupResponse {
    participant: string
    message: string
    timestamp: Date
}

export interface ConversationState {
    step: 'calendar' | 'location' | 'restaurant' | 'confirmation' | 'complete'
    responses: Map<string, any>
    allResponded: boolean
}

/**
 * Interactive Group Chat Agent
 * Asks questions in iMessage group and waits for all responses
 */
export class InteractiveAgent {
    private sdk: IMessageSDK
    private client: IMessageClient  // Add client for sending messages
    private llm: ChatGoogleGenerativeAI
    private groupChatId: string
    private participants: string[]
    private responses: Map<string, GroupResponse[]>

    constructor(
        apiKey: string,
        groupChatId: string,
        participants: string[],
        client?: IMessageClient  // Optional, will create if not provided
    ) {
        this.sdk = new IMessageSDK({
            debug: false,
            watcher: {
                pollInterval: 2000,
                unreadOnly: true,
                excludeOwnMessages: true
            }
        })

        this.client = client || new IMessageClient()  // Use provided or create new

        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })

        this.groupChatId = groupChatId
        this.participants = participants
        this.responses = new Map()
    }

    /**
     * Send a question to the group and wait for all responses
     */
    async askGroupQuestion(
        question: string,
        timeout: number = 300000 // 5 minutes default
    ): Promise<Map<string, string>> {
        console.log(`\n📤 Sending question to group...`)
        console.log(`   "${question}"`)

        // Send question to group
        await this.client.send(this.groupChatId, question)  // Use client

        console.log(`\n⏳ Waiting for at least one response...`)
        console.log(`   Timeout: ${timeout / 1000} seconds\n`)

        // Wait for responses from all participants
        const responses = await this.waitForResponses(timeout)

        console.log(`\n✅ Received ${responses.size} responses\n`)
        return responses
    }

    /**
     * Wait for responses from all participants
     */
    private async waitForResponses(timeout: number): Promise<Map<string, string>> {
        const responses = new Map<string, string>()
        const respondedParticipants = new Set<string>()
        const startTime = Date.now()

        // Start watching for messages
        await this.sdk.startWatching({
            onNewMessage: async (message: any) => {
                // Only process messages from this group
                if (message.chatId !== this.groupChatId) return
                
                // Skip our own messages (bot messages)
                if (message.isFromMe) return

                // Accept any message from the group (not just specific participants)
                const sender = message.sender || message.handle || 'user'
                
                // Store the response (allow multiple responses from same person)
                if (!respondedParticipants.has(sender)) {
                    respondedParticipants.add(sender)
                    responses.set(sender, message.text)
                    
                    console.log(`   ✓ Response from ${sender}: "${message.text.slice(0, 50)}..."`)
                    console.log(`   ${respondedParticipants.size} response(s) received\n`)
                }
            }
        })

        // Wait until at least one person responds or timeout
        while (respondedParticipants.size < 1) {
            if (Date.now() - startTime > timeout) {
                console.log(`\n⚠️  Timeout reached. Got ${respondedParticipants.size} response(s)`)
                break
            }
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        this.sdk.stopWatching()
        return responses
    }

    /**
     * Analyze responses using AI to extract preferences
     */
    async analyzeResponses(
        question: string,
        responses: Map<string, string>,
        expectedFormat?: string
    ): Promise<any> {
        const responsesText = Array.from(responses.entries())
            .map(([person, response]) => `${person}: ${response}`)
            .join('\n')

        const prompt = `
Analyze these responses to the question: "${question}"

Responses:
${responsesText}

${expectedFormat || 'Extract the key information and preferences from these responses.'}

Provide a structured summary that can be used for planning.
`
        const result = await this.llm.invoke(prompt)
        return result.content
    }

    /**
     * Send a summary message to the group
     */
    async sendSummary(message: string): Promise<void> {
        await this.client.send(this.groupChatId, message)  // Use client instead of sdk
        console.log(`\n📤 Summary sent to group\n`)
    }

    /**
     * Ask for confirmation with Yes/No responses
     */
    async askConfirmation(question: string): Promise<{
        confirmed: boolean
        responses: Map<string, boolean>
    }> {
        console.log(`\n📤 Asking for confirmation...`)
        
        await this.client.send(this.groupChatId, `${question}\n\nReply with YES or NO`)  // Use client

        const responses = await this.waitForResponses(180000) // 3 minutes
        const confirmations = new Map<string, boolean>()
        let yesCount = 0

        for (const [person, response] of responses.entries()) {
            const normalized = response.toLowerCase().trim()
            const isYes = normalized.includes('yes') || 
                         normalized.includes('👍') || 
                         normalized === 'y'
            
            confirmations.set(person, isYes)
            if (isYes) yesCount++
        }

        const confirmed = yesCount >= Math.ceil(this.participants.length / 2)

        console.log(`   ${yesCount}/${this.participants.length} said YES`)
        console.log(`   Decision: ${confirmed ? 'CONFIRMED ✅' : 'NOT CONFIRMED ❌'}\n`)

        return { confirmed, responses: confirmations }
    }

    /**
     * Close the interactive agent
     */
    async close(): Promise<void> {
        await this.sdk.close()
    }
}
