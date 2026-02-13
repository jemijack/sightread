import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'
import { createMidiCapture } from './midi-capture.js'
import { handleStaticRequest } from './static-server.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const BUILD_DIR = resolve(__dirname, '../build/client')

const server = createServer((req, res) => {
  handleStaticRequest(BUILD_DIR, req, res)
})

const wss = new WebSocketServer({ server, path: '/midi' })

const capture = createMidiCapture((event) => {
  // Build 4-byte binary message: [type, note, velocity, reserved]
  const buf = Buffer.alloc(4)
  buf[0] = event.type === 'on' ? 1 : 0
  buf[1] = event.note
  buf[2] = event.velocity
  buf[3] = 0

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(buf)
    }
  }
})

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      type: 'hello',
      devices: capture.devices,
      selectedPort: capture.selectedPort,
    }),
  )
  console.log(`Client connected. Total clients: ${wss.clients.size}`)
})

function getLocalIp(): string | undefined {
  const interfaces = networkInterfaces()
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address
      }
    }
  }
  return undefined
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp()
  console.log('')
  console.log('Sightread server running:')
  console.log(`  Local:   http://localhost:${PORT}`)
  if (localIp) {
    console.log(`  Network: http://${localIp}:${PORT}  <-- open this on iPad`)
  }
  console.log(
    `  MIDI:    ${capture.devices.length > 0 ? capture.devices.join(', ') : 'no devices found'}`,
  )
  console.log('')
})
