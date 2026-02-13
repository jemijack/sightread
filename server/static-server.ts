import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mid': 'audio/midi',
  '.midi': 'audio/midi',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.map': 'application/json',
}

export function handleStaticRequest(
  buildDir: string,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const filePath = join(buildDir, url.pathname)

  // Serve the file if it exists and is a file (not a directory)
  if (existsSync(filePath)) {
    try {
      const stat = statSync(filePath)
      if (stat.isFile()) {
        const ext = extname(filePath)
        res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream')
        res.setHeader('Content-Length', stat.size)
        createReadStream(filePath).pipe(res)
        return
      }
    } catch {
      // Fall through to SPA fallback
    }
  }

  // SPA fallback: serve index.html for all non-file routes
  const indexPath = join(buildDir, 'index.html')
  if (existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html')
    createReadStream(indexPath).pipe(res)
  } else {
    res.statusCode = 404
    res.end('Not found. Run "npm run build" first.')
  }
}
