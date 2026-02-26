import * as cheerio from 'cheerio'

const FETCH_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 1_500_000
const MAX_FETCH_ATTEMPTS = 3
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const APP_USER_AGENT =
  'RecipeCollector/1.0 (+https://localhost; recipe metadata extraction for personal cookbook app)'
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function extractionError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function isPrivateIpv4(hostname) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return false
  }

  const [a, b] = hostname.split('.').map((part) => Number(part))
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127 ||
    (a === 169 && b === 254)
  )
}

function isBlockedHost(hostname) {
  const lower = hostname.toLowerCase()
  return (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower === '::1' ||
    lower.startsWith('fe80:') ||
    isPrivateIpv4(lower)
  )
}

function parseInputUrl(urlText) {
  if (typeof urlText !== 'string' || !urlText.trim()) {
    throw extractionError('INVALID_URL', 'Please provide a valid recipe URL')
  }

  let parsed
  try {
    parsed = new URL(urlText.trim())
  } catch {
    throw extractionError('INVALID_URL', 'Please provide a valid recipe URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw extractionError('INVALID_URL', 'Only http/https URLs are supported')
  }

  if (isBlockedHost(parsed.hostname)) {
    throw extractionError('BLOCKED_HOST', 'This host is not allowed for extraction')
  }

  return parsed
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value
  }
  if (value == null) {
    return []
  }
  return [value]
}

function stripTags(value) {
  if (typeof value !== 'string') {
    return ''
  }

  let text = value

  for (let pass = 0; pass < 2; pass += 1) {
    const decoded = cheerio.load(`<div>${text}</div>`).root().text()
    text = decoded
      .replace(/<[^>]+>/g, ' ')
      .replace(/^(?:[a-z][a-z0-9-]*\s+)?id=["'“”][^"'“”]+["'“”]>\s*(?:\d+\.\s*)?/i, '')
      .replace(/^[\u2022\u00b7\-–—]+\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text || text === decoded) {
      break
    }
  }

  return text
}

function normalizeLines(values, maxItems = 120) {
  const normalized = []
  for (const raw of toArray(values)) {
    if (normalized.length >= maxItems) {
      break
    }
    const text = stripTags(String(raw))
    if (!text) {
      continue
    }
    normalized.push(text)
  }
  return normalized
}

function flattenInstructions(value) {
  const steps = []

  function walk(node) {
    if (node == null) {
      return
    }

    if (typeof node === 'string') {
      const text = stripTags(node)
      if (text) {
        steps.push(text)
      }
      return
    }

    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    if (typeof node === 'object') {
      if (typeof node.text === 'string') {
        const text = stripTags(node.text)
        if (text) {
          steps.push(text)
        }
      }

      if (Array.isArray(node.itemListElement)) {
        node.itemListElement.forEach(walk)
      }

      if (Array.isArray(node.steps)) {
        node.steps.forEach(walk)
      }
    }
  }

  walk(value)

  return steps.slice(0, 150)
}

function pickImage(imageValue) {
  if (!imageValue) {
    return ''
  }

  if (typeof imageValue === 'string') {
    return imageValue.trim()
  }

  if (Array.isArray(imageValue)) {
    for (const item of imageValue) {
      const image = pickImage(item)
      if (image) {
        return image
      }
    }
    return ''
  }

  if (typeof imageValue === 'object') {
    if (typeof imageValue.url === 'string') {
      return imageValue.url.trim()
    }
    if (typeof imageValue.contentUrl === 'string') {
      return imageValue.contentUrl.trim()
    }
  }

  return ''
}

function toAbsoluteUrl(baseUrl, maybeRelative) {
  if (!maybeRelative) {
    return ''
  }

  try {
    return new URL(maybeRelative, baseUrl).toString()
  } catch {
    return ''
  }
}

function getTypeValue(node) {
  const raw = node?.['@type']
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value).toLowerCase())
  }
  if (typeof raw === 'string') {
    return [raw.toLowerCase()]
  }
  return []
}

function findRecipeNodes(jsonLdValues) {
  const found = []

  function inspect(node) {
    if (!node) {
      return
    }

    if (Array.isArray(node)) {
      node.forEach(inspect)
      return
    }

    if (typeof node !== 'object') {
      return
    }

    const types = getTypeValue(node)
    if (types.some((value) => value.includes('recipe'))) {
      found.push(node)
    }

    if (node['@graph']) {
      inspect(node['@graph'])
    }

    if (node.mainEntity) {
      inspect(node.mainEntity)
    }
  }

  inspect(jsonLdValues)
  return found
}

function scoreRecipeNode(node) {
  let score = 0
  if (node.name) {
    score += 2
  }
  if (node.recipeIngredient) {
    score += 4
  }
  if (node.recipeInstructions) {
    score += 4
  }
  if (node.image) {
    score += 1
  }
  return score
}

function inferCategories(recipeCategory) {
  const merged = normalizeLines(recipeCategory, 20).join(' ').toLowerCase()
  const categories = []

  if (merged.includes('breakfast')) categories.push('breakfast')
  if (merged.includes('lunch')) categories.push('lunch')
  if (merged.includes('dinner') || merged.includes('main')) categories.push('dinner')
  if (merged.includes('dessert') || merged.includes('cake') || merged.includes('cookie')) categories.push('dessert')
  if (merged.includes('snack')) categories.push('snack')
  if (merged.includes('side')) categories.push('side')
  if (merged.includes('drink') || merged.includes('beverage')) categories.push('beverage')

  return categories.length > 0 ? [...new Set(categories)] : ['other']
}

function extractFromMeta($, pageUrl) {
  const name = $('meta[property="og:title"]').attr('content') || $('title').text() || ''
  const image = $('meta[property="og:image"]').attr('content') || ''

  return {
    name: stripTags(name),
    image: toAbsoluteUrl(pageUrl, image),
    ingredients: [],
    directions: [],
    categories: ['other'],
    notes: '',
    source: 'meta-fallback',
  }
}

async function fetchHtml(url) {
  const headersByAttempt = [
    {
      'User-Agent': APP_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
    },
  ]

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const headers = headersByAttempt[Math.min(attempt, headersByAttempt.length - 1)]

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers,
        redirect: 'follow',
      })

      if (response.ok) {
        const html = await response.text()
        if (html.length > MAX_HTML_BYTES) {
          throw extractionError('FETCH_FAILED', 'Recipe page is too large to process')
        }

        return { html, finalUrl: response.url || url }
      }

      if (response.status === 401 || response.status === 403) {
        throw extractionError(
          'FETCH_FORBIDDEN',
          'This website blocked automated recipe extraction from the server. Try another recipe URL or add this recipe manually.',
        )
      }

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === MAX_FETCH_ATTEMPTS - 1) {
        throw extractionError('FETCH_FAILED', `Could not fetch URL (HTTP ${response.status})`)
      }

      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
    } catch (error) {
      if (error.name === 'AbortError') {
        if (attempt === MAX_FETCH_ATTEMPTS - 1) {
          throw extractionError('TIMEOUT', 'Timed out while fetching recipe page')
        }
      } else if (error.code) {
        throw error
      } else if (attempt === MAX_FETCH_ATTEMPTS - 1) {
        throw extractionError('FETCH_FAILED', 'Unable to fetch recipe page')
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw extractionError('FETCH_FAILED', 'Unable to fetch recipe page')
}

function buildNormalizedRecipe(recipeNode, pageUrl) {
  const name = stripTags(recipeNode?.name || '')
  const ingredients = normalizeLines(recipeNode?.recipeIngredient)
  const directions = flattenInstructions(recipeNode?.recipeInstructions)
  const image = toAbsoluteUrl(pageUrl, pickImage(recipeNode?.image))
  const categories = inferCategories(recipeNode?.recipeCategory)
  const description = stripTags(recipeNode?.description || '')
  const notes = description ? description.slice(0, 280) : `Imported from ${new URL(pageUrl).hostname}`

  return {
    name,
    image,
    ingredients,
    directions,
    categories,
    notes,
  }
}

export async function extractRecipeFromUrl(urlText) {
  const parsedUrl = parseInputUrl(urlText)
  const { html, finalUrl } = await fetchHtml(parsedUrl.toString())

  const $ = cheerio.load(html)
  const scripts = $('script[type="application/ld+json"]')
    .toArray()
    .map((el) => $(el).contents().text())
    .map((text) => safeJsonParse(text))
    .filter(Boolean)

  const recipeNodes = findRecipeNodes(scripts)
  const bestRecipeNode = recipeNodes.sort((a, b) => scoreRecipeNode(b) - scoreRecipeNode(a))[0]

  let normalized
  let source
  const warnings = []

  if (bestRecipeNode) {
    normalized = buildNormalizedRecipe(bestRecipeNode, finalUrl)
    source = 'json-ld'
  } else {
    normalized = extractFromMeta($, finalUrl)
    source = 'meta-fallback'
    warnings.push('No schema.org Recipe data found. Imported limited metadata.')
  }

  if (!normalized.name) {
    throw extractionError('NO_RECIPE_FOUND', 'Could not find a recipe title on this page')
  }

  if (normalized.ingredients.length === 0) {
    warnings.push('Ingredients were not found automatically.')
  }

  if (normalized.directions.length === 0) {
    warnings.push('Directions were not found automatically.')
  }

  return {
    data: {
      name: normalized.name,
      url: finalUrl,
      image: normalized.image,
      ingredients: normalized.ingredients,
      directions: normalized.directions,
      categories: normalized.categories,
      notes: normalized.notes,
      type: 'url',
    },
    meta: {
      source,
      domain: new URL(finalUrl).hostname,
      warnings,
    },
  }
}
