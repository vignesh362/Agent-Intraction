/**
 * iMessage Client - Simple Python-like interface for sending iMessages
 * 
 * @example
 * ```typescript
 * import { IMessageClient } from './src/index.js'
 * 
 * const client = new IMessageClient()
 * await client.send('chat123...', 'Hello!')
 * await client.close()
 * ```
 */

export { IMessageClient } from './client.js'
export type { IMessageConfig, SendOptions, GroupInfo } from './client.js'
