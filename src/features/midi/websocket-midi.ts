// Connects to the server's WebSocket MIDI relay and feeds events into
// the existing midiState singleton. Runs alongside local Web MIDI —
// on iPad (no Web MIDI), this is the sole input source.
// Fails silently if no server is running.

import midiState from './index'

let ws: WebSocket | null = null
let reconnectDelay = 1000

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${location.host}/midi`

  ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    console.log('[ws-midi] Connected to MIDI relay')
    reconnectDelay = 1000
  }

  ws.onmessage = (event) => {
    if (!(event.data instanceof ArrayBuffer)) return
    const buf = new Uint8Array(event.data)
    if (buf.length < 3) return

    const type = buf[0] // 1 = noteOn, 0 = noteOff
    const note = buf[1]
    const velocity = buf[2]

    if (type === 1 && velocity > 0) {
      midiState.press(note, velocity)
    } else {
      midiState.release(note)
    }
  }

  ws.onclose = () => {
    ws = null
    // Auto-reconnect with exponential backoff, max 10s
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 10000)
      connect()
    }, reconnectDelay)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

if (typeof window !== 'undefined') {
  connect()
}
