import midi from '@julusian/midi'

export type MidiNoteEvent = {
  type: 'on' | 'off'
  note: number
  velocity: number
}

export function createMidiCapture(onEvent: (event: MidiNoteEvent) => void) {
  const input = new midi.Input()
  const portCount = input.getPortCount()

  // Find first non-"through" port, matching the frontend's setupMidiDeviceListeners()
  let selectedPort = -1
  const devices: string[] = []
  for (let i = 0; i < portCount; i++) {
    const name = input.getPortName(i)
    devices.push(name)
    if (selectedPort === -1 && !name.toLowerCase().includes('through')) {
      selectedPort = i
    }
  }

  if (selectedPort >= 0) {
    console.log(`Opening MIDI port ${selectedPort}: ${devices[selectedPort]}`)
    input.openPort(selectedPort)
    input.on('message', (_deltaTime: number, message: number[]) => {
      if (message.length !== 3) return
      const command = message[0] >>> 4
      // 0x8 = Note Off, 0x9 = Note On — ignore everything else
      if (command !== 0x8 && command !== 0x9) return

      onEvent({
        type: command === 0x9 && message[2] > 0 ? 'on' : 'off',
        note: message[1],
        velocity: message[2],
      })
    })
  } else {
    console.warn('No MIDI input devices found.')
  }

  return {
    devices,
    selectedPort,
    close: () => {
      if (selectedPort >= 0) input.closePort()
    },
  }
}
