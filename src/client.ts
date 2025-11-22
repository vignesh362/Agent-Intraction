import { IMessageSDK } from '@photon-ai/imessage-kit'

export interface IMessageConfig {
    debug?: boolean
    maxConcurrent?: number
    timeout?: number
}

export interface SendOptions {
    text?: string
    images?: string[]
    files?: string[]
}

export interface GroupInfo {
    chatId: string
    name: string
    lastMessageAt: Date | null
    unreadCount: number
}

/**
 * Simple iMessage client for sending messages to groups or individuals
 * 
 * Usage:
 *   const client = new IMessageClient()
 *   await client.send('chat123...', 'Hello!')
 *   await client.send('+1234567890', 'Hi there!')
 */
export class IMessageClient {
    private sdk: IMessageSDK
    private initialized: boolean = false

    constructor(config: IMessageConfig = {}) {
        this.sdk = new IMessageSDK({
            debug: config.debug ?? false,
            maxConcurrent: config.maxConcurrent ?? 5,
            scriptTimeout: config.timeout ?? 30000,
            watcher: {
                pollInterval: 2000,
                unreadOnly: false,
                excludeOwnMessages: true
            }
        })
        this.initialized = true
    }

    /**
     * Send a message (text, images, or files) to a chat
     * 
     * @param chatId - Chat ID (e.g., 'chat123...') or phone number (e.g., '+1234567890')
     * @param message - Text message or object with text/images/files
     * 
     * @example
     * // Send text to group
     * await client.send('chat123', 'Hello world!')
     * 
     * @example
     * // Send to phone number
     * await client.send('+1234567890', 'Hi there!')
     * 
     * @example
     * // Send with images
     * await client.send('chat123', {
     *   text: 'Check this out!',
     *   images: ['/path/to/image.jpg']
     * })
     */
    async send(chatId: string, message: string | SendOptions): Promise<void> {
        try {
            // For group chats, use direct AppleScript since the SDK doesn't support them
            if (chatId.startsWith('chat')) {
                const textMessage = typeof message === 'string' ? message : message.text || ''
                await this.sendToGroupViaAppleScript(chatId, textMessage)
                console.log(`✅ Message sent to group ${chatId}`)
                return
            }
            
            // For phone numbers/emails, use the SDK
            await this.sdk.send(chatId, message)
            console.log(`✅ Message sent to ${chatId}`)
        } catch (error) {
            console.error(`❌ Failed to send message:`, error)
            throw error
        }
    }

    /**
     * Send to group chat using AppleScript directly
     * The basic iMessage Kit doesn't support group chats
     */
    private async sendToGroupViaAppleScript(chatId: string, text: string): Promise<void> {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        
        //Extract numeric ID from chatId (e.g., "chat85598446218630183" -> "85598446218630183")
        const numericId = chatId.replace('chat', '')
        
        // Escape special characters in the message
        const escapedText = text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
        
        // AppleScript to send to group using the chat's GUID
        const script = `
            tell application "Messages"
                set targetService to 1st account whose service type = iMessage
                set targetChat to 1st chat whose id = "iMessage;-;${numericId}"
                send "${escapedText}" to targetChat
            end tell
        `
        
        try {
            await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`)
        } catch (error) {
            // If that fails, try alternative format
            const altScript = `
                tell application "Messages"
                    set allChats to every chat
                    repeat with aChat in allChats
                        if id of aChat contains "${numericId}" then
                            send "${escapedText}" to aChat
                            return
                        end if
                    end repeat
                    error "Chat ${chatId} not found"
                end tell
            `
            await execAsync(`osascript -e '${altScript.replace(/'/g, "'\"'\"'")}'`)
        }
    }

    /**
     * Send text message to a chat
     * 
     * @param chatId - Chat ID or phone number
     * @param text - Text message to send
     */
    async sendText(chatId: string, text: string): Promise<void> {
        return this.send(chatId, text)
    }

    /**
     * Send image(s) to a chat
     * 
     * @param chatId - Chat ID or phone number
     * @param images - Single image path or array of image paths
     * @param text - Optional text to send with images
     */
    async sendImages(chatId: string, images: string | string[], text?: string): Promise<void> {
        const imageArray = Array.isArray(images) ? images : [images]
        return this.send(chatId, { text, images: imageArray })
    }

    /**
     * Send file(s) to a chat
     * 
     * @param chatId - Chat ID or phone number
     * @param files - Single file path or array of file paths
     * @param text - Optional text to send with files
     */
    async sendFiles(chatId: string, files: string | string[], text?: string): Promise<void> {
        const fileArray = Array.isArray(files) ? files : [files]
        return this.send(chatId, { text, files: fileArray })
    }

    /**
     * Send the same message to multiple chats
     * 
     * @param chatIds - Array of chat IDs
     * @param message - Text message or object with text/images/files
     */
    async sendToMultiple(chatIds: string[], message: string | SendOptions): Promise<void> {
        const messages = chatIds.map(chatId => ({
            to: chatId,
            content: message
        }))

        const results = await this.sdk.sendBatch(messages)
        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        console.log(`✅ Sent to ${successCount}/${chatIds.length} chats`)
        if (failCount > 0) {
            console.error(`❌ Failed to send to ${failCount} chats`)
            for (const result of results.filter(r => !r.success)) {
                console.error(`   - ${result.to}: ${result.error?.message || 'Unknown error'}`)
            }
        }
    }

    /**
     * List all group chats
     * 
     * @param limit - Maximum number of messages to analyze (default: 1000)
     * @returns Array of group chat information
     */
    async listGroups(limit: number = 1000): Promise<GroupInfo[]> {
        const result = await this.sdk.getMessages({
            limit,
            excludeOwnMessages: false
        })

        const groupMap = new Map<string, GroupInfo>()

        for (const msg of result.messages) {
            if (msg.isGroupChat && !groupMap.has(msg.chatId)) {
                groupMap.set(msg.chatId, {
                    chatId: msg.chatId,
                    name: msg.chatId.startsWith('chat') 
                        ? `Group ${msg.chatId.slice(4, 12)}` 
                        : msg.chatId,
                    lastMessageAt: msg.date,
                    unreadCount: 0
                })
            } else if (msg.isGroupChat && groupMap.has(msg.chatId)) {
                const existing = groupMap.get(msg.chatId)!
                if (msg.date > (existing.lastMessageAt || new Date(0))) {
                    existing.lastMessageAt = msg.date
                }
            }
        }

        // Get unread counts
        const unreadResult = await this.sdk.getUnreadMessages()
        for (const group of unreadResult) {
            const chat = Array.from(groupMap.values()).find(c =>
                c.chatId === group.sender || c.chatId.includes(group.sender)
            )
            if (chat) {
                chat.unreadCount = group.messages.length
            }
        }

        // Sort by most recent first
        return Array.from(groupMap.values()).sort((a, b) => {
            const timeA = a.lastMessageAt?.getTime() || 0
            const timeB = b.lastMessageAt?.getTime() || 0
            return timeB - timeA
        })
    }

    /**
     * Find a group by name or partial chat ID
     * 
     * @param search - Group name or partial chat ID to search for
     * @returns Group info or null if not found
     */
    async findGroup(search: string): Promise<GroupInfo | null> {
        const groups = await this.listGroups()

        // Try exact match first
        const exact = groups.find(g => 
            g.chatId === search || 
            g.name.toLowerCase() === search.toLowerCase()
        )
        if (exact) return exact

        // Try partial match
        const partial = groups.find(g =>
            g.chatId.toLowerCase().includes(search.toLowerCase()) ||
            g.name.toLowerCase().includes(search.toLowerCase())
        )

        return partial || null
    }

    /**
     * Get groups with unread messages
     * 
     * @returns Array of groups that have unread messages
     */
    async getUnreadGroups(): Promise<GroupInfo[]> {
        const groups = await this.listGroups()
        return groups.filter(g => g.unreadCount > 0)
    }

    /**
     * Close the SDK and clean up resources
     */
    async close(): Promise<void> {
        if (this.initialized) {
            await this.sdk.close()
            this.initialized = false
            console.log('✅ Client closed')
        }
    }
}
