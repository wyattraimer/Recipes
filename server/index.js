import express from 'express'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { extractRecipeFromUrl } from './recipe-extractor.js'

const app = express()
const PORT = Number(process.env.PORT || 8787)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_PATH = path.resolve(__dirname, '..', 'dist')
const DEFAULT_ALLOWED_ORIGINS = [
  'https://recipes-zmky.onrender.com',
  'https://org.coloradomesa.edu',
  'http://localhost:5173',
]
const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

function applyApiCors(req, res) {
  const origin = req.headers.origin

  if (!origin) {
    return
  }

  if (allowedOrigins.has('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  } else {
    return
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

app.use(express.json({ limit: '1mb' }))
app.use('/api', (req, res, next) => {
  applyApiCors(req, res)
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/recipes/extract', async (req, res) => {
  const { url } = req.body ?? {}

  try {
    const extraction = await extractRecipeFromUrl(url)
    res.json({ ok: true, ...extraction })
  } catch (error) {
    console.error('[recipes.extract] request failed', {
      url,
      code: error?.code || 'INTERNAL_ERROR',
      message: error?.message || 'Unknown extraction error',
      stack: error?.stack || null,
    })

    const code = error?.code || 'INTERNAL_ERROR'
    const status =
      code === 'INVALID_URL'
        ? 400
        : code === 'BLOCKED_HOST'
          ? 400
          : code === 'FETCH_FAILED'
            ? 502
            : code === 'FETCH_FORBIDDEN'
              ? 403
            : code === 'TIMEOUT'
              ? 504
              : code === 'NO_RECIPE_FOUND'
                ? 422
                : 500

    res.status(status).json({
      ok: false,
      error: {
        code,
        message: error?.message || 'Failed to extract recipe from URL',
      },
    })
  }
})

app.use('/api', (_req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API route not found',
    },
  })
})

app.use(express.static(DIST_PATH))

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Recipe Collector server listening on http://0.0.0.0:${PORT}`)
})
