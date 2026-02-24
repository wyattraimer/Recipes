import express from 'express'
import { extractRecipeFromUrl } from './recipe-extractor.js'

const app = express()
const PORT = 8787

app.use(express.json({ limit: '1mb' }))

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

app.listen(PORT, () => {
  console.log(`Recipe extractor API listening on http://localhost:${PORT}`)
})
