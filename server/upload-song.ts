import tonejs from '@tonejs/midi'
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { join, resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const PUBLIC_SONGS_DIR = join(PROJECT_ROOT, 'public/music/songs')
const BUILD_SONGS_DIR = join(PROJECT_ROOT, 'build/client/music/songs')
const MANIFEST_PATH = join(PROJECT_ROOT, 'src/manifest.json')

function slugify(name: string): string {
  return name
    .replace(/\.[^.]+$/, '') // remove extension
    .replace(/[^a-zA-Z0-9]+/g, '-') // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

function collectBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export async function handleUploadRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

  if (url.pathname !== '/api/upload' || req.method !== 'POST') {
    return false
  }

  try {
    const body = await collectBody(req)

    // Parse the multipart form data to get filename and file bytes
    const contentType = req.headers['content-type'] ?? ''
    let filename: string
    let fileBytes: Buffer

    if (contentType.includes('multipart/form-data')) {
      const boundary = contentType.split('boundary=')[1]
      if (!boundary) throw new Error('Missing boundary')
      const { name, data } = parseMultipart(body, boundary)
      filename = name
      fileBytes = data
    } else {
      // Raw upload with filename in header
      filename = req.headers['x-filename'] as string ?? 'unknown.mid'
      fileBytes = body
    }

    const ext = extname(filename).toLowerCase()
    if (ext !== '.mid' && ext !== '.midi') {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Only .mid/.midi files are accepted' }))
      return true
    }

    // Parse MIDI to get duration
    const midi = new tonejs.Midi(fileBytes)
    const duration = Math.round(midi.duration)

    // Create slug filename
    const slug = slugify(filename)
    const destFilename = `${slug}.mid`

    // Save to public/music/songs/
    mkdirSync(PUBLIC_SONGS_DIR, { recursive: true })
    const publicPath = join(PUBLIC_SONGS_DIR, destFilename)
    writeFileSync(publicPath, fileBytes)

    // Also copy to build/client/music/songs/ for immediate availability
    mkdirSync(BUILD_SONGS_DIR, { recursive: true })
    copyFileSync(publicPath, join(BUILD_SONGS_DIR, destFilename))

    // Build the title from the filename
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    // Update src/manifest.json
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    const alreadyExists = manifest.some((s: any) => s.id === destFilename)
    if (!alreadyExists) {
      manifest.push({
        file: `music/songs/${destFilename}`,
        title,
        source: 'builtin',
        id: destFilename,
        duration,
      })
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
    }

    console.log(`Uploaded song: ${destFilename} (${duration}s)`)

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true, id: destFilename, title, duration }))
    return true
  } catch (err: any) {
    console.error('Upload failed:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err.message ?? 'Upload failed' }))
    return true
  }
}

function parseMultipart(body: Buffer, boundary: string): { name: string; data: Buffer } {
  const boundaryBuf = Buffer.from(`--${boundary}`)
  const parts: { headers: string; data: Buffer }[] = []

  let start = body.indexOf(boundaryBuf)
  while (start !== -1) {
    start += boundaryBuf.length
    // Skip \r\n after boundary
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2

    const headerEnd = body.indexOf('\r\n\r\n', start)
    if (headerEnd === -1) break
    const headers = body.subarray(start, headerEnd).toString()
    const dataStart = headerEnd + 4

    const nextBoundary = body.indexOf(boundaryBuf, dataStart)
    if (nextBoundary === -1) break
    // Remove trailing \r\n before next boundary
    let dataEnd = nextBoundary - 2
    parts.push({ headers, data: body.subarray(dataStart, dataEnd) })

    start = nextBoundary
  }

  for (const part of parts) {
    const filenameMatch = part.headers.match(/filename="([^"]+)"/)
    if (filenameMatch) {
      return { name: filenameMatch[1], data: part.data }
    }
  }

  throw new Error('No file found in upload')
}
