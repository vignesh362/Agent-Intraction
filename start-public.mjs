#!/usr/bin/env node
/**
 * Start OAuth server with public URL using localtunnel
 */

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

console.log('🌐 Starting OAuth server with public URL...\n')

// Start the OAuth test in background
console.log('📡 Starting OAuth server on port 3000...')
const server = spawn('npm', ['run', 'test-calendar'], {
    stdio: 'inherit',
    shell: true,
    detached: false
})

// Wait for server to start
await setTimeout(3000)

// Start localtunnel
console.log('\n🔗 Creating public URL...\n')
const tunnel = spawn('lt', ['--port', '3000', '--subdomain', 'holiday-planner-' + Math.random().toString(36).substring(7)], {
    stdio: 'inherit',
    shell: true
})

// Handle cleanup
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping servers...')
    server.kill()
    tunnel.kill()
    process.exit(0)
})

// Keep running
await new Promise(() => {})
