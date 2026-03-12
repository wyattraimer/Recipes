import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const CATEGORIES = {
  breakfast: { icon: 'fa-coffee', color: '#ffc107' },
  lunch: { icon: 'fa-sun', color: '#28a745' },
  dinner: { icon: 'fa-moon', color: '#6f42c1' },
  dessert: { icon: 'fa-ice-cream', color: '#e83e8c' },
  snack: { icon: 'fa-cookie', color: '#fd7e14' },
  side: { icon: 'fa-carrot', color: '#ffb703' },
  beverage: { icon: 'fa-mug-hot', color: '#17a2b8' },
  other: { icon: 'fa-utensils', color: '#6c757d' },
}

const CATEGORY_OPTIONS = [
  'breakfast',
  'lunch',
  'dinner',
  'dessert',
  'snack',
  'side',
  'beverage',
  'other',
]

const DEFAULT_RECIPES = [
  {
    id: 1001,
    name: 'Classic Chocolate Chip Cookies',
    url: 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/',
    image:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80',
    ingredients: [
      '2 1/4 cups all-purpose flour',
      '1 tsp baking soda',
      '1 tsp salt',
      '1 cup unsalted butter, softened',
      '3/4 cup granulated sugar',
      '3/4 cup packed brown sugar',
      '2 large eggs',
      '2 tsp vanilla extract',
      '2 cups semisweet chocolate chips',
    ],
    directions: [
      'Preheat oven to 375 F and line two baking sheets with parchment paper.',
      'Whisk flour, baking soda, and salt together in a medium bowl.',
      'Beat butter, granulated sugar, and brown sugar until creamy, then mix in eggs and vanilla.',
      'Mix dry ingredients into wet ingredients just until combined, then fold in chocolate chips.',
      'Scoop 2 tablespoon portions of dough onto baking sheets and bake 9-11 minutes until edges are golden.',
      'Cool on the pan for 3 minutes before transferring cookies to a wire rack.',
    ],
    categories: ['dessert', 'snack'],
    notes: 'Slightly underbake for chewier centers. Sprinkle flaky salt on top while warm.',
    type: 'url',
  },
  {
    id: 1002,
    name: 'Sheet Pan Chicken Fajita Bowls',
    url: 'https://www.budgetbytes.com/sheet-pan-chicken-fajitas/',
    image:
      'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=1200&q=80',
    ingredients: [
      '1 1/2 lb boneless skinless chicken thighs, sliced',
      '2 bell peppers, sliced',
      '1 red onion, sliced',
      '2 tbsp olive oil',
      '1 1/2 tsp chili powder',
      '1 tsp cumin',
      '1 tsp smoked paprika',
      '1/2 tsp garlic powder',
      '1/2 tsp salt',
      '2 cups cooked rice for serving',
    ],
    directions: [
      'Preheat oven to 425 F and line a sheet pan with parchment paper.',
      'Toss chicken, peppers, and onion with olive oil and all seasonings until evenly coated.',
      'Spread mixture on the sheet pan in an even layer.',
      'Roast 18-22 minutes until chicken is cooked through and vegetables are tender.',
      'Serve over warm rice and finish with lime juice or your favorite toppings.',
    ],
    categories: ['dinner', 'lunch'],
    notes: 'Great for meal prep. Add black beans and corn to stretch servings.',
    type: 'url',
  },
  {
    id: 1003,
    name: 'Lemon Blueberry Buttermilk Pancakes',
    image:
      'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80',
    ingredients: [
      '2 cups all-purpose flour',
      '2 tbsp sugar',
      '2 tsp baking powder',
      '1/2 tsp baking soda',
      '1/2 tsp salt',
      '2 cups buttermilk',
      '2 large eggs',
      '3 tbsp melted butter',
      '1 tsp vanilla extract',
      '1 tbsp lemon zest',
      '1 cup fresh blueberries',
    ],
    directions: [
      'Whisk flour, sugar, baking powder, baking soda, and salt in a large bowl.',
      'In another bowl, whisk buttermilk, eggs, melted butter, vanilla, and lemon zest.',
      'Pour wet ingredients into dry ingredients and stir gently until mostly combined.',
      'Fold in blueberries and let batter rest for 5 minutes.',
      'Cook pancakes on a lightly greased skillet over medium heat until bubbles form, then flip and cook until golden.',
      'Serve warm with maple syrup and extra blueberries.',
    ],
    categories: ['breakfast', 'dessert'],
    notes: 'Use frozen blueberries straight from the freezer to avoid purple batter.',
    type: 'custom',
  },
]

const STORAGE_KEY = 'recipeBookmarks'
const THEME_KEY = 'recipeTheme'
const MEAL_PLAN_KEY = 'recipeMealPlan'
const FALLBACK_API_BASE =
  import.meta.env.PROD && window.location.hostname.endsWith('coloradomesa.edu')
    ? 'https://recipes-zmky.onrender.com/api'
    : '/api'
const API_BASE = (import.meta.env.VITE_API_BASE || FALLBACK_API_BASE).replace(/\/$/, '')
const EXTRACT_ENDPOINT = `${API_BASE}/recipes/extract`

const MEAL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner']

const emptyForm = {
  name: '',
  url: '',
  image: '',
  ingredients: '',
  directions: '',
  notes: '',
  categories: [],
}

function migrateRecipes(recipes) {
  return recipes.map((recipe) => {
    if (recipe.category && !recipe.categories) {
      return {
        ...recipe,
        categories: [recipe.category],
      }
    }
    return recipe
  })
}

function formatCategory(category) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function createEmptyMealPlan() {
  return MEAL_DAYS.reduce((plan, day) => {
    plan[day] = { Breakfast: '', Lunch: '', Dinner: '' }
    return plan
  }, {})
}

function normalizeIngredientKey(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

const UNICODE_FRACTIONS = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅐': '1/7',
  '⅑': '1/9',
  '⅒': '1/10',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

const UNIT_ALIASES = {
  tsp: { aliases: ['tsp', 'teaspoon', 'teaspoons', 't'], type: 'volume', toBase: 4.92892 },
  tbsp: { aliases: ['tbsp', 'tablespoon', 'tablespoons'], type: 'volume', toBase: 14.7868 },
  cup: { aliases: ['cup', 'cups', 'c'], type: 'volume', toBase: 236.588 },
  ml: { aliases: ['ml', 'milliliter', 'milliliters'], type: 'volume', toBase: 1 },
  l: { aliases: ['l', 'liter', 'liters'], type: 'volume', toBase: 1000 },
  oz: { aliases: ['oz', 'ounce', 'ounces'], type: 'mass', toBase: 28.3495 },
  lb: { aliases: ['lb', 'lbs', 'pound', 'pounds'], type: 'mass', toBase: 453.592 },
  g: { aliases: ['g', 'gram', 'grams'], type: 'mass', toBase: 1 },
  kg: { aliases: ['kg', 'kilogram', 'kilograms'], type: 'mass', toBase: 1000 },
  clove: { aliases: ['clove', 'cloves'], type: 'count', toBase: 1 },
  can: { aliases: ['can', 'cans'], type: 'count', toBase: 1 },
  piece: { aliases: ['piece', 'pieces'], type: 'count', toBase: 1 },
  slice: { aliases: ['slice', 'slices'], type: 'count', toBase: 1 },
  bunch: { aliases: ['bunch', 'bunches'], type: 'count', toBase: 1 },
  stick: { aliases: ['stick', 'sticks'], type: 'count', toBase: 1 },
  package: { aliases: ['package', 'packages', 'pkg', 'pkgs'], type: 'count', toBase: 1 },
}

const UNIT_LOOKUP = Object.entries(UNIT_ALIASES).reduce((lookup, [unit, config]) => {
  config.aliases.forEach((alias) => {
    lookup[alias] = unit
  })
  return lookup
}, {})

const NAME_ALIASES = {
  'all purpose flour': 'flour',
  'all-purpose flour': 'flour',
  scallions: 'green onion',
  scallion: 'green onion',
  'confectioners sugar': 'powdered sugar',
  'powdered sugars': 'powdered sugar',
}

const NOISE_WORDS = new Set([
  'fresh',
  'chopped',
  'diced',
  'minced',
  'large',
  'small',
  'medium',
  'optional',
  'to',
  'taste',
])

function replaceUnicodeFractions(text) {
  return text
    .split('')
    .map((char) => (UNICODE_FRACTIONS[char] ? ` ${UNICODE_FRACTIONS[char]} ` : char))
    .join('')
}

function parseNumericToken(token) {
  if (!token) {
    return null
  }

  const normalized = token.replace(/,/g, '').trim()
  if (!normalized) {
    return null
  }

  if (/^\d+\/\d+$/.test(normalized)) {
    const [num, den] = normalized.split('/').map(Number)
    if (!den) {
      return null
    }
    return num / den
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized)
  }

  return null
}

function parseLeadingQuantity(tokens) {
  if (tokens.length === 0) {
    return { quantity: null, consumed: 0 }
  }

  const first = parseNumericToken(tokens[0])
  if (first == null) {
    return { quantity: null, consumed: 0 }
  }

  let consumed = 1
  let quantity = first

  const second = parseNumericToken(tokens[1])
  if (second != null && second < 1) {
    quantity += second
    consumed += 1
  }

  return { quantity, consumed }
}

function normalizeIngredientName(rawName) {
  const base = rawName
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(',')[0]
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const cleaned = base
    .split(' ')
    .filter((word) => !NOISE_WORDS.has(word))
    .join(' ')
    .trim()

  if (!cleaned) {
    return ''
  }

  const singular = cleaned
    .split(' ')
    .map((word) => {
      if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
        return word.slice(0, -1)
      }
      return word
    })
    .join(' ')

  return NAME_ALIASES[singular] || singular
}

function parseIngredientLine(rawText) {
  const replaced = replaceUnicodeFractions(rawText || '')
  const cleaned = replaced
    .replace(/^[-*•]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return null
  }

  const tokens = cleaned.split(' ')
  const { quantity, consumed } = parseLeadingQuantity(tokens)

  let tokenIndex = consumed
  let unitKey = ''
  let unitType = ''
  let toBase = 1

  const rawUnit = (tokens[tokenIndex] || '').toLowerCase().replace(/[.,]/g, '')
  if (UNIT_LOOKUP[rawUnit]) {
    unitKey = UNIT_LOOKUP[rawUnit]
    unitType = UNIT_ALIASES[unitKey].type
    toBase = UNIT_ALIASES[unitKey].toBase
    tokenIndex += 1
  }

  const remaining = tokens.slice(tokenIndex).join(' ').trim()
  const normalizedName = normalizeIngredientName(remaining)

  if (!normalizedName) {
    return {
      raw: cleaned,
      convertible: false,
    }
  }

  if (quantity == null || !unitType) {
    return {
      raw: cleaned,
      name: normalizedName,
      convertible: false,
    }
  }

  return {
    raw: cleaned,
    name: normalizedName,
    quantity,
    unitKey,
    unitType,
    toBase,
    convertible: true,
  }
}

function toDisplayName(name) {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function roundQuantity(value) {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) {
    return String(rounded)
  }
  return rounded.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')
}

function formatTotalUnit(baseAmount, unitType, preferredSystem) {
  if (unitType === 'count') {
    return { quantity: baseAmount, unit: '' }
  }

  if (unitType === 'volume') {
    if (preferredSystem === 'metric') {
      if (baseAmount >= 1000) {
        return { quantity: baseAmount / 1000, unit: 'l' }
      }
      return { quantity: baseAmount, unit: 'ml' }
    }

    if (baseAmount >= UNIT_ALIASES.cup.toBase) {
      return { quantity: baseAmount / UNIT_ALIASES.cup.toBase, unit: 'cup' }
    }
    if (baseAmount >= UNIT_ALIASES.tbsp.toBase) {
      return { quantity: baseAmount / UNIT_ALIASES.tbsp.toBase, unit: 'tbsp' }
    }
    return { quantity: baseAmount / UNIT_ALIASES.tsp.toBase, unit: 'tsp' }
  }

  if (preferredSystem === 'metric') {
    if (baseAmount >= 1000) {
      return { quantity: baseAmount / 1000, unit: 'kg' }
    }
    return { quantity: baseAmount, unit: 'g' }
  }

  if (baseAmount >= UNIT_ALIASES.lb.toBase) {
    return { quantity: baseAmount / UNIT_ALIASES.lb.toBase, unit: 'lb' }
  }
  return { quantity: baseAmount / UNIT_ALIASES.oz.toBase, unit: 'oz' }
}

function buildShoppingAggregation(candidates, preferredSystem) {
  const totalsMap = new Map()
  const unresolvedMap = new Map()

  candidates
    .filter((candidate) => candidate.selected)
    .forEach((candidate) => {
      const ingredients = Array.isArray(candidate.recipe.ingredients) ? candidate.recipe.ingredients : []
      ingredients.forEach((rawIngredient) => {
        const parsed = parseIngredientLine(rawIngredient)
        if (!parsed) {
          return
        }

        if (!parsed.convertible) {
          const unresolvedKey = normalizeIngredientKey(parsed.raw)
          const unresolved = unresolvedMap.get(unresolvedKey) || {
            key: `unresolved:${unresolvedKey}`,
            text: parsed.raw,
            count: 0,
          }
          unresolved.count += 1
          unresolvedMap.set(unresolvedKey, unresolved)
          return
        }

        const totalKey =
          parsed.unitType === 'count'
            ? `${parsed.unitType}:${parsed.unitKey}:${parsed.name}`
            : `${parsed.unitType}:${parsed.name}`

        const existing = totalsMap.get(totalKey) || {
          key: `total:${totalKey}`,
          name: parsed.name,
          unitType: parsed.unitType,
          unitKey: parsed.unitKey,
          baseAmount: 0,
          sourceCount: 0,
        }

        existing.baseAmount += parsed.quantity * parsed.toBase
        existing.sourceCount += 1
        totalsMap.set(totalKey, existing)
      })
    })

  const totals = Array.from(totalsMap.values())
    .map((entry) => {
      if (entry.unitType === 'count') {
        return {
          ...entry,
          amountLabel: `${roundQuantity(entry.baseAmount)} ${entry.unitKey} ${toDisplayName(entry.name)}`,
        }
      }

      const display = formatTotalUnit(entry.baseAmount, entry.unitType, preferredSystem)
      return {
        ...entry,
        amountLabel: `${roundQuantity(display.quantity)} ${display.unit} ${toDisplayName(entry.name)}`,
      }
    })
    .sort((a, b) => a.amountLabel.localeCompare(b.amountLabel))

  const unresolved = Array.from(unresolvedMap.values()).sort((a, b) => a.text.localeCompare(b.text))
  return { totals, unresolved }
}

function App() {
  const [recipes, setRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : DEFAULT_RECIPES
      return migrateRecipes(parsed)
    } catch {
      return DEFAULT_RECIPES
    }
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [activeView, setActiveView] = useState('recipes')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [focusedRecipe, setFocusedRecipe] = useState(null)
  const [currentEditingId, setCurrentEditingId] = useState(null)
  const [currentRecipeType, setCurrentRecipeType] = useState('url')
  const [form, setForm] = useState(emptyForm)
  const [highlightedId, setHighlightedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [showSwUpdateBanner, setShowSwUpdateBanner] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    return savedTheme === 'dark' ? 'dark' : 'light'
  })
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false)
  const [importCandidates, setImportCandidates] = useState([])
  const [importSummary, setImportSummary] = useState(null)
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false)
  const [exportCandidates, setExportCandidates] = useState([])
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)
  const [shoppingCandidates, setShoppingCandidates] = useState([])
  const [shoppingChecklist, setShoppingChecklist] = useState({})
  const [shoppingUnitSystem, setShoppingUnitSystem] = useState('us')
  const [shoppingMergeSelection, setShoppingMergeSelection] = useState({})
  const [shoppingManualGroups, setShoppingManualGroups] = useState([])
  const [shoppingManualText, setShoppingManualText] = useState('')
  const [shoppingManualEditingKey, setShoppingManualEditingKey] = useState('')
  const [shoppingManualEditDraft, setShoppingManualEditDraft] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractWarnings, setExtractWarnings] = useState([])
  const [extractCandidate, setExtractCandidate] = useState(null)
  const [mealPlan, setMealPlan] = useState(() => {
    try {
      const savedPlan = localStorage.getItem(MEAL_PLAN_KEY)
      if (!savedPlan) {
        return createEmptyMealPlan()
      }
      const parsed = JSON.parse(savedPlan)
      const base = createEmptyMealPlan()
      MEAL_DAYS.forEach((day) => {
        MEAL_SLOTS.forEach((slot) => {
          base[day][slot] = parsed?.[day]?.[slot] || ''
        })
      })
      return base
    } catch {
      return createEmptyMealPlan()
    }
  })

  const swRegistrationRef = useRef(null)
  const importInputRef = useRef(null)
  const networkStatusRef = useRef(navigator.onLine)

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim()
    return recipes
      .filter((recipe) => {
        const matchesSearch =
          !normalizedSearch ||
          recipe.name.toLowerCase().includes(normalizedSearch) ||
          (recipe.categories || []).some((cat) => cat.toLowerCase().includes(normalizedSearch)) ||
          (recipe.notes || '').toLowerCase().includes(normalizedSearch)

        const matchesCategory = !categoryFilter || (recipe.categories || []).includes(categoryFilter)
        const matchesPinned = !showPinnedOnly || Boolean(recipe.pinned)
        return matchesSearch && matchesCategory && matchesPinned
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
  }, [recipes, searchTerm, categoryFilter, showPinnedOnly])

  const plannerRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes],
  )

  const recipeNameById = useMemo(() => {
    const map = new Map()
    recipes.forEach((recipe) => {
      map.set(String(recipe.id), recipe.name)
    })
    return map
  }, [recipes])

  const selectedImportCount = useMemo(
    () => importCandidates.filter((candidate) => candidate.selected).length,
    [importCandidates],
  )

  const selectedExportCount = useMemo(
    () => exportCandidates.filter((candidate) => candidate.selected).length,
    [exportCandidates],
  )

  const selectedShoppingCount = useMemo(
    () => shoppingCandidates.filter((candidate) => candidate.selected).length,
    [shoppingCandidates],
  )

  const shoppingAggregation = useMemo(
    () => buildShoppingAggregation(shoppingCandidates, shoppingUnitSystem),
    [shoppingCandidates, shoppingUnitSystem],
  )

  const combinedShoppingItems = shoppingAggregation.totals
  const unresolvedShoppingItems = shoppingAggregation.unresolved
  const unresolvedByKey = useMemo(
    () => Object.fromEntries(unresolvedShoppingItems.map((item) => [item.key, item])),
    [unresolvedShoppingItems],
  )
  const hiddenUnresolvedKeys = useMemo(() => {
    const hidden = new Set()
    shoppingManualGroups.forEach((group) => {
      group.sourceKeys.forEach((key) => hidden.add(key))
    })
    return hidden
  }, [shoppingManualGroups])
  const visibleUnresolvedItems = useMemo(
    () => unresolvedShoppingItems.filter((item) => !hiddenUnresolvedKeys.has(item.key)),
    [unresolvedShoppingItems, hiddenUnresolvedKeys],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(mealPlan))
  }, [mealPlan])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme

    const themeColor = theme === 'dark' ? '#0b131d' : '#e63946'
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeColor)
    }

    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (statusBarMeta) {
      statusBarMeta.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default')
    }

    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setShowInstallBtn(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    const setOnlineStatus = (online, notify = true) => {
      const changed = networkStatusRef.current !== online
      networkStatusRef.current = online
      setIsOnline(online)

      if (!changed) {
        return
      }

      if (!notify) {
        return
      }

      const id = Date.now() + Math.random()
      setMessages((prev) => [
        ...prev,
        {
          id,
          text: online
            ? 'Back online. Network features are available again.'
            : 'You are offline. Some features like URL extraction will not work.',
          type: online ? 'success' : 'info',
        },
      ])
      window.setTimeout(() => {
        setMessages((prev) => prev.filter((message) => message.id !== id))
      }, 3000)
    }

    const onOnline = () => setOnlineStatus(true, true)
    const onOffline = () => setOnlineStatus(false, true)

    const verifyReachability = async () => {
      if (!navigator.onLine) {
        setOnlineStatus(false, false)
        return
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 4500)

      try {
        const response = await fetch(`${API_BASE}/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })
        setOnlineStatus(response.ok, false)
      } catch {
        setOnlineStatus(false, false)
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifyReachability()
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('focus', onVisibilityChange)
    document.addEventListener('visibilitychange', onVisibilityChange)

    networkStatusRef.current = navigator.onLine
    setIsOnline(navigator.onLine)
    void verifyReachability()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('focus', onVisibilityChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined
    }

    const onControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const checkForUpdates = () => {
      const registration = swRegistrationRef.current
      if (!registration) {
        return
      }
      registration.update().catch(() => undefined)
    }

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        swRegistrationRef.current = registration

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          return
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) {
            return
          }
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              installingWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        checkForUpdates()
      })
      .catch(() => undefined)

    const periodicUpdateCheck = window.setInterval(checkForUpdates, 60 * 1000)
    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)

    return () => {
      window.clearInterval(periodicUpdateCheck)
      window.removeEventListener('focus', onVisibilityOrFocus)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        setIsImportPreviewOpen(false)
        setIsExportPreviewOpen(false)
        setIsShoppingListOpen(false)
        setFocusedRecipe(null)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > 320
      setShowBackToTop((prev) => (prev === shouldShow ? prev : shouldShow))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setShoppingChecklist((prev) => {
      const validKeys = new Set([
        ...combinedShoppingItems.map((item) => item.key),
        ...visibleUnresolvedItems.map((item) => item.key),
        ...shoppingManualGroups.map((group) => group.key),
      ])
      const next = {}
      Object.entries(prev).forEach(([key, checked]) => {
        if (validKeys.has(key)) {
          next[key] = checked
        }
      })
      return next
    })
  }, [combinedShoppingItems, visibleUnresolvedItems, shoppingManualGroups])

  useEffect(() => {
    const validKeys = new Set(unresolvedShoppingItems.map((item) => item.key))

    setShoppingMergeSelection((prev) => {
      const next = {}
      Object.entries(prev).forEach(([key, selected]) => {
        if (validKeys.has(key)) {
          next[key] = selected
        }
      })
      return next
    })

    setShoppingManualGroups((prev) =>
      prev
        .map((group) => ({
          ...group,
          sourceKeys: group.sourceKeys.filter((key) => validKeys.has(key)),
        }))
        .filter((group) => group.sourceKeys.length > 0),
    )
  }, [unresolvedShoppingItems])

  function showMessage(text, type = 'info') {
    const id = Date.now() + Math.random()
    setMessages((prev) => [...prev, { id, text, type }])
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((message) => message.id !== id))
    }, 3000)
  }

  function requireOnline(featureLabel, detail = 'requires an internet connection.') {
    if (networkStatusRef.current) {
      return true
    }

    showMessage(`You are offline. ${featureLabel} ${detail}`, 'info')
    return false
  }

  function closeImportPreview() {
    setIsImportPreviewOpen(false)
    setImportCandidates([])
    setImportSummary(null)
  }

  function closeExportPreview() {
    setIsExportPreviewOpen(false)
    setExportCandidates([])
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  function openModal(recipe = null) {
    setExtractWarnings([])
    setExtractCandidate(null)

    if (!recipe) {
      setCurrentEditingId(null)
      setCurrentRecipeType('url')
      setForm(emptyForm)
      setIsModalOpen(true)
      return
    }

    const recipeType = recipe.type || (recipe.url ? 'url' : 'custom')
    setCurrentEditingId(recipe.id)
    setCurrentRecipeType(recipeType)
    setForm({
      name: recipe.name || '',
      url: recipe.url || '',
      image: recipe.image || '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.join('\n') : '',
      directions: Array.isArray(recipe.directions) ? recipe.directions.join('\n') : '',
      notes: recipe.notes || '',
      categories: recipe.categories || (recipe.category ? [recipe.category] : []),
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setCurrentEditingId(null)
    setIsExtracting(false)
    setExtractWarnings([])
    setExtractCandidate(null)
  }

  function openFocusedRecipe(recipe) {
    setFocusedRecipe(recipe)
  }

  function closeFocusedRecipe() {
    setFocusedRecipe(null)
  }

  function toggleCategory(category) {
    setForm((prev) => {
      const exists = prev.categories.includes(category)
      if (exists) {
        return { ...prev, categories: prev.categories.filter((item) => item !== category) }
      }
      return { ...prev, categories: [...prev.categories, category] }
    })
  }

  function makeRecipeId(existingIds) {
    let id = Date.now()
    while (existingIds.has(id)) {
      id += 1
    }
    return id
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      showMessage('Please enter a recipe name', 'error')
      return
    }

    if (form.categories.length === 0) {
      showMessage('Please select at least one category', 'error')
      return
    }

    let recipeData
    if (currentRecipeType === 'url') {
      if (!form.url.trim()) {
        showMessage('Please enter a recipe URL', 'error')
        return
      }

      const extractedIngredients = form.ingredients
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean)
      const extractedDirections = form.directions
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean)

      recipeData = {
        name: form.name.trim(),
        url: form.url.trim(),
        image: form.image.trim(),
        ingredients: extractedIngredients,
        directions: extractedDirections,
        categories: form.categories,
        notes: form.notes.trim(),
        type: 'url',
      }
    } else {
      const ingredients = form.ingredients
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean)
      const directions = form.directions
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean)

      if (ingredients.length === 0) {
        showMessage('Please enter ingredients', 'error')
        return
      }

      if (directions.length === 0) {
        showMessage('Please enter directions', 'error')
        return
      }

      recipeData = {
        name: form.name.trim(),
        ingredients,
        directions,
        image: form.image.trim(),
        categories: form.categories,
        notes: form.notes.trim(),
        type: 'custom',
      }
    }

    if (currentEditingId) {
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === currentEditingId
            ? { ...recipe, ...recipeData, pinned: Boolean(recipe.pinned), id: currentEditingId }
            : recipe,
        ),
      )
      showMessage('Recipe updated successfully!', 'success')
    } else {
      const existingIds = new Set(recipes.map((recipe) => recipe.id))
      setRecipes((prev) => [{ ...recipeData, pinned: false, id: makeRecipeId(existingIds) }, ...prev])
      showMessage('Recipe added successfully!', 'success')
    }

    closeModal()
  }

  function handleDeleteRecipe(id) {
    const shouldDelete = window.confirm('Are you sure you want to delete this recipe?')
    if (!shouldDelete) {
      return
    }

    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id))
    setMealPlan((prev) => {
      const next = createEmptyMealPlan()
      MEAL_DAYS.forEach((day) => {
        MEAL_SLOTS.forEach((slot) => {
          const value = prev[day]?.[slot] || ''
          next[day][slot] = String(value) === String(id) ? '' : value
        })
      })
      return next
    })
  }

  function togglePinnedRecipe(id) {
    setRecipes((prev) =>
      prev.map((recipe) => (recipe.id === id ? { ...recipe, pinned: !recipe.pinned } : recipe)),
    )
  }

  function updateMealPlan(day, slot, recipeId) {
    setMealPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: recipeId,
      },
    }))
  }

  function clearMealPlan() {
    const shouldClear = window.confirm('Clear all planned meals for the week?')
    if (!shouldClear) {
      return
    }
    setMealPlan(createEmptyMealPlan())
    showMessage('Meal planner cleared.', 'info')
  }

  function visitRecipe(url) {
    if (!requireOnline('Opening recipe websites')) {
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function copyRecipeUrl(url) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = url
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'absolute'
        tempInput.style.left = '-9999px'
        document.body.appendChild(tempInput)
        tempInput.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(tempInput)
        if (!successful) {
          throw new Error('Copy command failed')
        }
      }
      showMessage('Recipe URL copied to clipboard!', 'success')
    } catch {
      showMessage('Could not copy URL. Please copy it manually.', 'error')
    }
  }

  async function handleExtractFromUrl() {
    const inputUrl = form.url.trim()
    if (!inputUrl) {
      showMessage('Enter a recipe URL first.', 'error')
      return
    }

    if (!requireOnline('URL extraction')) {
      return
    }

    try {
      setIsExtracting(true)
      setExtractWarnings([])
      setExtractCandidate(null)

      const response = await fetch(EXTRACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inputUrl }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        const message = payload?.error?.message || 'Could not extract recipe details from this URL'
        throw new Error(message)
      }

      const extracted = payload.data
      const warnings = payload.meta?.warnings || []

      setExtractWarnings(warnings)
      setExtractCandidate({
        data: extracted,
        meta: payload.meta || null,
        warnings,
      })
      showMessage('Recipe details extracted. Review and apply.', 'success')
    } catch (error) {
      const failedMessage = error?.message || 'Extraction failed'
      const isNetworkFailure =
        error?.name === 'AbortError' ||
        failedMessage === 'Failed to fetch' ||
        failedMessage.toLowerCase().includes('network')

      if (isNetworkFailure) {
        networkStatusRef.current = false
        setIsOnline(false)
        showMessage('You are offline (or the API is unreachable). URL extraction is unavailable right now.', 'info')
      } else {
        showMessage(failedMessage, 'error')
      }
      setExtractWarnings([])
      setExtractCandidate(null)
    } finally {
      setIsExtracting(false)
    }
  }

  function applyExtractCandidate() {
    if (!extractCandidate?.data) {
      return
    }

    const extracted = extractCandidate.data
    setForm((prev) => ({
      ...prev,
      name: extracted.name || prev.name,
      url: extracted.url || prev.url,
      image: extracted.image || prev.image,
      ingredients: (extracted.ingredients || []).join('\n'),
      directions: (extracted.directions || []).join('\n'),
      notes: extracted.notes || prev.notes,
      categories:
        Array.isArray(extracted.categories) && extracted.categories.length > 0
          ? extracted.categories
          : prev.categories,
    }))

    setExtractCandidate(null)
    setExtractWarnings([])
    showMessage('Extracted fields applied to the form.', 'success')
  }

  function discardExtractCandidate() {
    setExtractCandidate(null)
    setExtractWarnings([])
    showMessage('Extracted preview discarded.', 'info')
  }

  function randomizeRecipe() {
    if (recipes.length === 0) {
      window.alert('No recipes to randomize! Add some recipes first.')
      return
    }

    if (filteredRecipes.length === 0) {
      window.alert('No recipes match your current filters. Try adjusting search/category.')
      return
    }

    const randomIndex = Math.floor(Math.random() * filteredRecipes.length)
    const selectedRecipe = filteredRecipes[randomIndex]
    setHighlightedId(selectedRecipe.id)

    const target = document.querySelector(`[data-recipe-id="${selectedRecipe.id}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    window.setTimeout(() => {
      openFocusedRecipe(selectedRecipe)
      setHighlightedId(null)
    }, 600)
  }

  function exportRecipes() {
    if (recipes.length === 0) {
      window.alert('No recipes to export! Add some recipes first.')
      return
    }

    setExportCandidates(
      recipes.map((recipe, index) => ({
        previewId: `export-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        recipe,
        selected: true,
      })),
    )
    setIsExportPreviewOpen(true)
  }

  function toggleExportCandidate(previewId) {
    setExportCandidates((prev) =>
      prev.map((candidate) =>
        candidate.previewId === previewId ? { ...candidate, selected: !candidate.selected } : candidate,
      ),
    )
  }

  function setAllExportCandidates(selected) {
    setExportCandidates((prev) => prev.map((candidate) => ({ ...candidate, selected })))
  }

  function confirmExportSelection() {
    const selectedRecipes = exportCandidates
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.recipe)

    if (selectedRecipes.length === 0) {
      showMessage('Select at least one recipe to export.', 'error')
      return
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      recipes: selectedRecipes,
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const filename = `recipe-bookmarks-${new Date().toISOString().split('T')[0]}.json`
    const blob = new Blob([jsonString], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
    closeExportPreview()
    showMessage(
      `Exported ${selectedRecipes.length} recipe${selectedRecipes.length !== 1 ? 's' : ''} successfully!`,
      'success',
    )
  }

  function openShoppingListBuilder() {
    const candidates = recipes
      .filter((recipe) => Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0)
      .map((recipe) => ({
        previewId: `shop-${recipe.id}`,
        recipe,
        selected: true,
      }))

    if (candidates.length === 0) {
      showMessage('Add recipes with ingredients to build a shopping list.', 'info')
      return
    }

    setShoppingCandidates(candidates)
    setShoppingChecklist({})
    setShoppingMergeSelection({})
    setShoppingManualGroups([])
    setShoppingManualText('')
    setIsShoppingListOpen(true)
  }

  function closeShoppingListBuilder() {
    setIsShoppingListOpen(false)
    setShoppingCandidates([])
    setShoppingChecklist({})
    setShoppingMergeSelection({})
    setShoppingManualGroups([])
    setShoppingManualText('')
    setShoppingManualEditingKey('')
    setShoppingManualEditDraft('')
  }

  function toggleShoppingCandidate(previewId) {
    setShoppingCandidates((prev) =>
      prev.map((candidate) =>
        candidate.previewId === previewId ? { ...candidate, selected: !candidate.selected } : candidate,
      ),
    )
  }

  function setAllShoppingCandidates(selected) {
    setShoppingCandidates((prev) => prev.map((candidate) => ({ ...candidate, selected })))
  }

  function toggleShoppingItemChecked(itemKey) {
    setShoppingChecklist((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }))
  }

  function clearShoppingChecklist() {
    setShoppingChecklist({})
  }

  function toggleShoppingMergeSelection(itemKey) {
    if (hiddenUnresolvedKeys.has(itemKey)) {
      return
    }
    setShoppingMergeSelection((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }))
  }

  function createManualMergeGroup() {
    const selectedKeys = visibleUnresolvedItems
      .map((item) => item.key)
      .filter((key) => Boolean(shoppingMergeSelection[key]))

    if (selectedKeys.length < 2) {
      showMessage('Select at least two Needs Review items to merge.', 'error')
      return
    }

    const defaultLabel = selectedKeys
      .map((key) => unresolvedByKey[key]?.text)
      .filter(Boolean)
      .join(' + ')

    const normalizedCustom = shoppingManualText.trim()
    const label = normalizedCustom || defaultLabel

    if (!label) {
      showMessage('Please provide a label for the merged item.', 'error')
      return
    }

    const group = {
      key: `manual:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      text: label,
      sourceKeys: selectedKeys,
      count: selectedKeys.reduce((sum, key) => sum + (unresolvedByKey[key]?.count || 1), 0),
    }

    setShoppingManualGroups((prev) => [...prev, group])
    setShoppingMergeSelection((prev) => {
      const next = { ...prev }
      selectedKeys.forEach((key) => {
        delete next[key]
      })
      return next
    })
    setShoppingManualText('')
    showMessage('Merged selected items into a manual shopping entry.', 'success')
  }

  function splitManualMergeGroup(groupKey) {
    setShoppingManualGroups((prev) => prev.filter((group) => group.key !== groupKey))
    setShoppingChecklist((prev) => {
      const next = { ...prev }
      delete next[groupKey]
      return next
    })
    if (shoppingManualEditingKey === groupKey) {
      setShoppingManualEditingKey('')
      setShoppingManualEditDraft('')
    }
    showMessage('Manual merged item was split back into original entries.', 'info')
  }

  function startEditingManualMergeGroup(group) {
    setShoppingManualEditingKey(group.key)
    setShoppingManualEditDraft(group.text)
  }

  function cancelEditingManualMergeGroup() {
    setShoppingManualEditingKey('')
    setShoppingManualEditDraft('')
  }

  function saveEditingManualMergeGroup(groupKey) {
    setShoppingManualGroups((prev) =>
      prev.map((group) => {
        if (group.key !== groupKey) {
          return group
        }

        const normalized = shoppingManualEditDraft.trim()
        if (normalized) {
          return { ...group, text: normalized }
        }

        const fallback =
          group.sourceKeys
            .map((key) => unresolvedByKey[key]?.text)
            .filter(Boolean)
            .join(' + ') || 'Merged item'

        return { ...group, text: fallback }
      }),
    )

    setShoppingManualEditingKey('')
    setShoppingManualEditDraft('')
  }

  function exportShoppingListText() {
    const selectedRecipes = shoppingCandidates.filter((candidate) => candidate.selected)
    if (selectedRecipes.length === 0) {
      showMessage('Select at least one recipe before exporting a shopping list.', 'error')
      return
    }

    const lines = []
    lines.push('Recipe Collector Shopping List')
    lines.push(`Generated: ${new Date().toLocaleString()}`)
    lines.push('')
    lines.push('Selected Recipes:')
    selectedRecipes.forEach((candidate) => lines.push(`- ${candidate.recipe.name}`))
    lines.push('')
    lines.push('Combined Totals:')

    combinedShoppingItems.forEach((item) => {
      const mark = shoppingChecklist[item.key] ? '[x]' : '[ ]'
      lines.push(`${mark} ${item.amountLabel}`)
    })

    if (visibleUnresolvedItems.length > 0) {
      lines.push('')
      lines.push('Needs Review (not safely totaled):')
      visibleUnresolvedItems.forEach((item) => {
        const mark = shoppingChecklist[item.key] ? '[x]' : '[ ]'
        lines.push(`${mark} ${item.text}${item.count > 1 ? ` (${item.count} recipes)` : ''}`)
      })
    }

    if (shoppingManualGroups.length > 0) {
      lines.push('')
      lines.push('Manual Merge Items:')
      shoppingManualGroups.forEach((group) => {
        const mark = shoppingChecklist[group.key] ? '[x]' : '[ ]'
        lines.push(`${mark} ${group.text}${group.count > 1 ? ` (${group.count} lines)` : ''}`)
      })
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const downloadUrl = URL.createObjectURL(blob)
    const fileName = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)

    showMessage('Shopping list exported.', 'success')
  }

  function filterImportedRecipes(newRecipes) {
    const existingIds = new Set(recipes.map((recipe) => recipe.id))

    return newRecipes
      .filter((recipe) => !recipe.url || !recipes.find((current) => current.url === recipe.url))
      .map((recipe) => {
        const normalized = {
          ...recipe,
          categories: recipe.categories || (recipe.category ? [recipe.category] : []),
          pinned: Boolean(recipe.pinned),
        }
        if (normalized.id == null || existingIds.has(normalized.id)) {
          normalized.id = makeRecipeId(existingIds)
        }
        existingIds.add(normalized.id)
        return normalized
      })
  }

  function toggleImportCandidate(previewId) {
    setImportCandidates((prev) =>
      prev.map((candidate) =>
        candidate.previewId === previewId ? { ...candidate, selected: !candidate.selected } : candidate,
      ),
    )
  }

  function removeImportCandidate(previewId) {
    setImportCandidates((prev) => prev.filter((candidate) => candidate.previewId !== previewId))
  }

  function setAllImportCandidates(selected) {
    setImportCandidates((prev) => prev.map((candidate) => ({ ...candidate, selected })))
  }

  function confirmImportSelection() {
    const selectedRecipes = importCandidates
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.recipe)

    if (selectedRecipes.length === 0) {
      showMessage('Select at least one recipe to import.', 'error')
      return
    }

    setRecipes((prev) => [...selectedRecipes, ...prev])
    closeImportPreview()
    showMessage(
      `Successfully imported ${selectedRecipes.length} recipe${selectedRecipes.length !== 1 ? 's' : ''}!`,
      'success',
    )
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.name.endsWith('.json')) {
      showMessage('Please select a JSON file', 'error')
      event.target.value = ''
      return
    }

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data.recipes)) {
        throw new Error('Invalid recipe file format')
      }

      const validRecipes = data.recipes.filter((recipe) => {
        const hasCategories =
          (Array.isArray(recipe.categories) && recipe.categories.length > 0) || Boolean(recipe.category)

        if (!recipe.name || !hasCategories) {
          return false
        }

        if (recipe.url) {
          return true
        }

        return (
          Array.isArray(recipe.ingredients) &&
          recipe.ingredients.length > 0 &&
          Array.isArray(recipe.directions) &&
          recipe.directions.length > 0
        )
      })

      if (validRecipes.length === 0) {
        throw new Error('No valid recipes found in file')
      }

      const importedRecipes = filterImportedRecipes(validRecipes)
      if (importedRecipes.length === 0) {
        showMessage('No new recipes to import (all duplicates).', 'info')
        event.target.value = ''
        return
      }

      const invalidCount = data.recipes.length - validRecipes.length
      const duplicateCount = validRecipes.length - importedRecipes.length

      setImportSummary({
        totalInFile: data.recipes.length,
        validCount: validRecipes.length,
        duplicateCount,
        invalidCount,
      })

      setImportCandidates(
        importedRecipes.map((recipe, index) => ({
          previewId: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
          recipe,
          selected: true,
        })),
      )
      setIsImportPreviewOpen(true)

      if (invalidCount > 0 || duplicateCount > 0) {
        showMessage(
          `${invalidCount > 0 ? `${invalidCount} invalid skipped. ` : ''}${duplicateCount > 0 ? `${duplicateCount} duplicates skipped.` : ''}`,
          'info',
        )
      }
    } catch (error) {
      showMessage(`Import failed: ${error.message}`, 'error')
    } finally {
      event.target.value = ''
    }
  }

  function deleteAllRecipes() {
    if (recipes.length === 0) {
      showMessage('You have no recipes to delete.', 'info')
      return
    }

    const sure = window.confirm(
      `Are you sure you want to permanently delete all ${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}?`,
    )
    if (!sure) {
      return
    }

    const exported = window.confirm(
      'Have you exported your recipes? Press OK to delete all recipes, or Cancel to abort.',
    )
    if (!exported) {
      showMessage('Deletion cancelled. Please export your recipes before deleting.', 'info')
      return
    }

    setRecipes([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    showMessage('All recipes have been deleted.', 'success')
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowInstallBtn(false)
  }

  function triggerSwUpdate() {
    const reg = swRegistrationRef.current
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowSwUpdateBanner(false)
  }

  function scrollToTop() {
    const startY = window.scrollY
    if (startY <= 0) {
      return
    }

    const duration = 260
    const startTime = performance.now()

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      window.scrollTo(0, Math.round(startY * (1 - eased)))

      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }

  return (
    <>
      {messages.length > 0 ? (
        <div className="message-stack" aria-live="polite" aria-atomic="true">
          {messages.map((message) => (
            <div key={message.id} className={`message-pill message-pill-${message.type}`}>
              {message.text}
            </div>
          ))}
        </div>
      ) : null}

      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1 className="logo">
              <i className="fas fa-utensils" />
              Recipe Collector
            </h1>
            <p className="tagline">Your personal collection of favorite recipes</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <section className="controls">
            <div className="controls-label">Browse</div>
            <div className="controls-context">
              <div className="controls-context-left">
                <div className="view-toggle-group" role="tablist" aria-label="App view">
                  <button
                    className={`btn btn-small ${activeView === 'recipes' ? 'btn-primary' : 'btn-secondary'}`}
                    type="button"
                    onClick={() => setActiveView('recipes')}
                  >
                    <i className="fas fa-th-large" />
                    Recipes
                  </button>
                  <button
                    className={`btn btn-small ${activeView === 'planner' ? 'btn-primary' : 'btn-secondary'}`}
                    type="button"
                    onClick={() => setActiveView('planner')}
                  >
                    <i className="fas fa-calendar-alt" />
                    Meal Planner
                  </button>
                </div>

                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <i className="fas fa-search" />
                </div>

                <div className="category-filter">
                  <select
                    className="category-select"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="">All Categories</option>
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {formatCategory(category)}
                      </option>
                    ))}
                  </select>
                  <i className="fas fa-filter" />
                </div>
              </div>

              <div className="controls-context-right">
                <div className="results-count" aria-live="polite">
                  Showing {filteredRecipes.length} of {recipes.length}
                </div>

                <label className="theme-switch" aria-label="Toggle dark mode">
                  <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                  <span className="theme-switch-track">
                    <span className="theme-switch-knob">
                      <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`} />
                    </span>
                  </span>
                  <span className="theme-switch-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                </label>
              </div>
            </div>

            <div className="controls-label">Actions</div>
            <div className="controls-primary-actions">
              <button className="btn btn-primary" type="button" onClick={() => openModal()}>
                <i className="fas fa-plus" />
                Add Recipe
              </button>
              <button className="btn btn-secondary" type="button" onClick={randomizeRecipe}>
                <i className="fas fa-dice" />
                Random Recipe
              </button>
              <button
                className={`btn ${showPinnedOnly ? 'btn-primary' : 'btn-secondary'}`}
                type="button"
                onClick={() => setShowPinnedOnly((prev) => !prev)}
              >
                <i className={`fas ${showPinnedOnly ? 'fa-star' : 'fa-star-half-alt'}`} />
                {showPinnedOnly ? 'Pinned Only' : 'All + Pinned'}
              </button>
            </div>

            <div className="controls-label">Data & Tools</div>
            <div className="controls-utility-actions">
              <button className="btn btn-secondary" type="button" onClick={openShoppingListBuilder}>
                <i className="fas fa-cart-shopping" />
                Shopping List
              </button>
              <button className="btn btn-secondary" type="button" onClick={exportRecipes}>
                <i className="fas fa-download" />
                Export
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                <i className="fas fa-upload" />
                Import
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />

              <div className="controls-danger-zone">
                <button className="btn btn-danger" type="button" onClick={deleteAllRecipes}>
                  <i className="fas fa-trash-alt" />
                  Delete All
                </button>
              </div>
            </div>

            <details className="ios-install-help">
              <summary>
                <i className="fas fa-mobile-screen-button" />
                iPhone App Install Tips
              </summary>
              <p>
                Recommended: Use Brave as your default browser to help block ads and popups.
              </p>
              <ol>
                <li>When you want to install this app, open this website in Safari on your iPhone.</li>
                <li>Tap the button with three dots on the bottom right.</li>
                <li>Tap 'Share' (square with the up arrow).</li>
                <li>Tap 'More'.</li>
                <li>Select Add to Home Screen.</li>
                <li>Tap Add to finish.</li>
              </ol>
            </details>
          </section>

          {activeView === 'recipes' ? (
            filteredRecipes.length > 0 ? (
              <section className="recipe-grid">
                {filteredRecipes.map((recipe) => {
                  const categories = recipe.categories || (recipe.category ? [recipe.category] : [])
                  const hasIngredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
                  const hasDirections = Array.isArray(recipe.directions) && recipe.directions.length > 0
                  const hasDetailedRecipe = hasIngredients || hasDirections

                  return (
                    <article
                      key={recipe.id}
                      className={`recipe-card recipe-card-clickable ${highlightedId === recipe.id ? 'highlighted' : ''}`}
                      data-recipe-id={recipe.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openFocusedRecipe(recipe)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openFocusedRecipe(recipe)
                        }
                      }}
                    >
                      <div className="recipe-header">
                        <h3 className="recipe-title">{recipe.name}</h3>
                        <div className="recipe-categories">
                          {categories.map((cat) => {
                            const info = CATEGORIES[cat] || CATEGORIES.other
                            return (
                              <span key={cat} className="recipe-category" style={{ backgroundColor: info.color }}>
                                <i className={`fas ${info.icon}`} />
                                {cat}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <div className="recipe-body">
                        {recipe.image ? <img src={recipe.image} alt={recipe.name} className="recipe-image" /> : null}

                        {recipe.notes ? <p className="recipe-notes">{recipe.notes}</p> : null}

                        {hasDetailedRecipe ? (
                          <>
                            {hasIngredients ? (
                              <div className="recipe-section">
                                <h4 className="recipe-section-title">
                                  <i className="fas fa-list" />
                                  Ingredients
                                </h4>
                                <ul className="recipe-list">
                                  {(recipe.ingredients || []).map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {hasDirections ? (
                              <div className="recipe-section">
                                <h4 className="recipe-section-title">
                                  <i className="fas fa-directions" />
                                  Directions
                                </h4>
                                <ol className="recipe-list">
                                  {(recipe.directions || []).map((step) => (
                                    <li key={step}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        <div className="recipe-actions">
                          {recipe.url ? (
                            <>
                              <button
                                className="btn btn-small btn-visit"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  visitRecipe(recipe.url)
                                }}
                              >
                                <i className="fas fa-external-link-alt" />
                                Visit
                              </button>
                              <button
                                className="btn btn-small btn-copy"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  copyRecipeUrl(recipe.url)
                                }}
                              >
                                <i className="fas fa-copy" />
                                Copy URL
                              </button>
                            </>
                          ) : null}
                          <button
                            className={`btn btn-small ${recipe.pinned ? 'btn-pin-active' : 'btn-pin'}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              togglePinnedRecipe(recipe.id)
                            }}
                          >
                            <i className={`fas ${recipe.pinned ? 'fa-star' : 'fa-star-half-alt'}`} />
                            {recipe.pinned ? 'Pinned' : 'Pin'}
                          </button>
                          <button
                            className="btn btn-small btn-primary"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openModal(recipe)
                            }}
                          >
                            <i className="fas fa-edit" />
                            Edit
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDeleteRecipe(recipe.id)
                            }}
                          >
                            <i className="fas fa-trash" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </section>
            ) : (
              <section className="no-recipes">
                <i className="fas fa-cookie-bite" />
                <h2>{recipes.length > 0 ? 'No recipes found' : 'No recipes yet!'}</h2>
                <p>
                  {recipes.length > 0
                    ? 'Try adjusting your search terms.'
                    : 'Start building your collection by adding your favorite recipe websites.'}
                </p>
                {recipes.length === 0 ? (
                  <button className="btn btn-primary" type="button" onClick={() => openModal()}>
                    <i className="fas fa-plus" />
                    Add Your First Recipe
                  </button>
                ) : null}
              </section>
            )
          ) : (
            <section className="meal-planner">
              <div className="meal-planner-header">
                <h2>Weekly Meal Planner</h2>
                <button className="btn btn-small btn-secondary" type="button" onClick={clearMealPlan}>
                  <i className="fas fa-eraser" />
                  Clear Week
                </button>
              </div>
              {plannerRecipes.length === 0 ? (
                <p className="meal-planner-empty">Add at least one recipe before building your meal plan.</p>
              ) : null}
              <div className="meal-planner-grid">
                {MEAL_DAYS.map((day) => (
                  <article key={day} className="meal-day-card">
                    <h3>{day}</h3>
                    {MEAL_SLOTS.map((slot) => (
                      <label key={`${day}-${slot}`} className="meal-slot">
                        <span>{slot}</span>
                        <select
                          className="meal-slot-select"
                          value={mealPlan[day]?.[slot] || ''}
                          onChange={(event) => updateMealPlan(day, slot, event.target.value)}
                        >
                          <option value="">No recipe selected</option>
                          {plannerRecipes.map((recipe) => (
                            <option key={`${day}-${slot}-${recipe.id}`} value={String(recipe.id)}>
                              {recipe.pinned ? '★ ' : ''}
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                        {mealPlan[day]?.[slot] ? (
                          <small className="meal-slot-selected">
                            {recipeNameById.get(String(mealPlan[day][slot])) || 'Recipe not found'}
                          </small>
                        ) : null}
                      </label>
                    ))}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {focusedRecipe ? (
        <div className="focused-recipe-overlay" role="dialog" aria-modal="true" onClick={closeFocusedRecipe}>
          <article className="focused-recipe-panel" onClick={(event) => event.stopPropagation()}>
            <button className="focused-recipe-close" type="button" onClick={closeFocusedRecipe}>
              <i className="fas fa-times" />
              Close
            </button>

            <header className="focused-recipe-header">
              <h2>{focusedRecipe.name}</h2>
              <div className="recipe-categories">
                {(focusedRecipe.categories || (focusedRecipe.category ? [focusedRecipe.category] : [])).map((cat) => {
                  const info = CATEGORIES[cat] || CATEGORIES.other
                  return (
                    <span key={`focused-${focusedRecipe.id}-${cat}`} className="recipe-category" style={{ backgroundColor: info.color }}>
                      <i className={`fas ${info.icon}`} />
                      {cat}
                    </span>
                  )
                })}
              </div>
            </header>

            {focusedRecipe.image ? (
              <div className="focused-recipe-image-wrap">
                <img src={focusedRecipe.image} alt={focusedRecipe.name} className="focused-recipe-image" />
              </div>
            ) : null}

            {focusedRecipe.notes ? <p className="recipe-notes">{focusedRecipe.notes}</p> : null}

            {Array.isArray(focusedRecipe.ingredients) && focusedRecipe.ingredients.length > 0 ? (
              <section className="focused-recipe-section">
                <h3 className="recipe-section-title">
                  <i className="fas fa-list" />
                  Ingredients
                </h3>
                <ul className="recipe-list">
                  {focusedRecipe.ingredients.map((item) => (
                    <li key={`focused-ing-${item}`}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {Array.isArray(focusedRecipe.directions) && focusedRecipe.directions.length > 0 ? (
              <section className="focused-recipe-section">
                <h3 className="recipe-section-title">
                  <i className="fas fa-directions" />
                  Directions
                </h3>
                <ol className="recipe-list">
                  {focusedRecipe.directions.map((step) => (
                    <li key={`focused-step-${step}`}>{step}</li>
                  ))}
                </ol>
              </section>
            ) : null}

            <div className="focused-recipe-actions">
              {focusedRecipe.url ? (
                <>
                  <button className="btn btn-visit" type="button" onClick={() => visitRecipe(focusedRecipe.url)}>
                    <i className="fas fa-external-link-alt" />
                    Visit
                  </button>
                  <button className="btn btn-copy" type="button" onClick={() => copyRecipeUrl(focusedRecipe.url)}>
                    <i className="fas fa-copy" />
                    Copy URL
                  </button>
                </>
              ) : null}
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  openModal(focusedRecipe)
                  closeFocusedRecipe()
                }}
              >
                <i className="fas fa-edit" />
                Edit Recipe
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="modal show" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <span className="close" onClick={closeModal}>
              &times;
            </span>
            <h2>{currentEditingId ? 'Edit Recipe' : 'Add New Recipe'}</h2>

            <div className="form-group recipe-type-toggle">
              <label>Recipe Type</label>
              <div className="toggle-buttons">
                <button
                  type="button"
                  className={`toggle-btn ${currentRecipeType === 'url' ? 'toggle-btn-active' : ''}`}
                  onClick={() => setCurrentRecipeType('url')}
                >
                  <i className="fas fa-link" />
                  Recipe from URL
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${currentRecipeType === 'custom' ? 'toggle-btn-active' : ''}`}
                  onClick={() => setCurrentRecipeType('custom')}
                >
                  <i className="fas fa-pencil-alt" />
                  Your Recipe
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="recipeName">Recipe Name</label>
                <input
                  id="recipeName"
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              {currentRecipeType === 'url' ? (
                <>
                  <div className="form-group">
                    <label htmlFor="recipeUrl">Recipe URL</label>
                    <input
                      id="recipeUrl"
                      type="url"
                      required
                      value={form.url}
                      onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                    />
                  </div>

                  <div className="extract-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={handleExtractFromUrl}
                      disabled={isExtracting}
                    >
                      <i className={`fas ${isExtracting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} />
                      {isExtracting ? 'Extracting...' : isOnline ? 'Extract Details from URL' : 'Extraction Unavailable Offline'}
                    </button>
                    <p className="extract-notice">
                      {isOnline
                        ? 'First extract can take up to about 50 seconds while the free-tier API wakes up. After that, extracts are usually much faster.'
                        : 'You are offline. URL extraction needs internet, but your saved recipes, planner, and cached pages still work.'}
                    </p>
                  </div>

                  {extractCandidate ? (
                    <div className="extract-preview-card">
                      <div className="extract-preview-header">
                        <strong>{extractCandidate.data.name || 'Unnamed recipe'}</strong>
                        {extractCandidate.meta ? (
                          <span className="extract-meta">
                            Source: {extractCandidate.meta.source} ({extractCandidate.meta.domain})
                          </span>
                        ) : null}
                      </div>
                      <div className="extract-preview-stats">
                        <span>Ingredients: {(extractCandidate.data.ingredients || []).length}</span>
                        <span>Directions: {(extractCandidate.data.directions || []).length}</span>
                        <span>Categories: {(extractCandidate.data.categories || []).length}</span>
                      </div>

                      {extractWarnings.length > 0 ? (
                        <div className="extract-warning-box">
                          {extractWarnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
                        </div>
                      ) : null}

                      {extractCandidate.data.image ? (
                        <div className="extract-image-preview">
                          <img src={extractCandidate.data.image} alt="Extracted recipe" />
                        </div>
                      ) : null}

                      <div className="extract-preview-actions">
                        <button className="btn btn-primary btn-small" type="button" onClick={applyExtractCandidate}>
                          Apply Extracted Fields
                        </button>
                        <button className="btn btn-secondary btn-small" type="button" onClick={discardExtractCandidate}>
                          Discard
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="form-group">
                    <label htmlFor="recipeIngredients">Ingredients (optional / extracted)</label>
                    <textarea
                      id="recipeIngredients"
                      rows="4"
                      placeholder="Extracted ingredients will appear here"
                      value={form.ingredients}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          ingredients: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="recipeDirections">Directions (optional / extracted)</label>
                    <textarea
                      id="recipeDirections"
                      rows="4"
                      placeholder="Extracted directions will appear here"
                      value={form.directions}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          directions: event.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="recipeIngredients">Ingredients</label>
                    <textarea
                      id="recipeIngredients"
                      rows="4"
                      placeholder="Enter ingredients, one per line"
                      value={form.ingredients}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          ingredients: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="recipeDirections">Directions</label>
                    <textarea
                      id="recipeDirections"
                      rows="4"
                      placeholder="Enter directions, one step per line"
                      value={form.directions}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          directions: event.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="recipeImage">Recipe Image URL (optional)</label>
                <input
                  id="recipeImage"
                  type="url"
                  placeholder="https://example.com/recipe-image.jpg"
                  value={form.image}
                  onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                />
              </div>

              {form.image ? (
                <div className="recipe-image-editor">
                  <div className="extract-image-preview">
                    <img src={form.image} alt="Recipe preview" />
                  </div>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                  >
                    <i className="fas fa-image" />
                    Remove Image
                  </button>
                </div>
              ) : null}

              <div className="form-group">
                <label>Categories (select at least one)</label>
                <div className="category-checkboxes">
                  {CATEGORY_OPTIONS.map((category) => (
                    <div key={category} className="checkbox-item">
                      <input
                        id={`cat-${category}`}
                        type="checkbox"
                        checked={form.categories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <label htmlFor={`cat-${category}`}>{formatCategory(category)}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recipeNotes">Notes (optional)</label>
                <textarea
                  id="recipeNotes"
                  rows="3"
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </div>

              <button className="btn btn-primary" type="submit">
                {currentEditingId ? 'Update Recipe' : 'Add Recipe'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isImportPreviewOpen ? (
        <div className="modal show" role="dialog" aria-modal="true" onClick={closeImportPreview}>
          <div className="modal-content import-preview-modal" onClick={(event) => event.stopPropagation()}>
            <span className="close" onClick={closeImportPreview}>
              &times;
            </span>
            <h2>Review Import</h2>
            <p className="import-preview-subtitle">
              Select which recipes to import. You can uncheck or remove any recipe before importing.
            </p>

            {importSummary ? (
              <div className="import-summary">
                <span className="import-summary-chip">File: {importSummary.totalInFile}</span>
                <span className="import-summary-chip">Valid: {importSummary.validCount}</span>
                <span className="import-summary-chip">Duplicates skipped: {importSummary.duplicateCount}</span>
                <span className="import-summary-chip">Invalid skipped: {importSummary.invalidCount}</span>
              </div>
            ) : null}

            <div className="import-preview-actions">
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setAllImportCandidates(true)}>
                Select All
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setAllImportCandidates(false)}>
                Clear All
              </button>
            </div>

            <div className="import-preview-list">
              {importCandidates.map((candidate) => {
                const { recipe, previewId, selected } = candidate
                const categories = recipe.categories || []
                const recipeType = recipe.type === 'custom' || !recipe.url ? 'Custom recipe' : 'URL recipe'

                return (
                  <article key={previewId} className="import-preview-item">
                    <label className="import-preview-check">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleImportCandidate(previewId)}
                      />
                      <span>Include</span>
                    </label>
                    <div className="import-preview-content">
                      <h3>{recipe.name}</h3>
                      <p>{recipeType}</p>
                      {recipe.url ? <a href={recipe.url}>{recipe.url}</a> : null}
                      {categories.length > 0 ? (
                        <div className="import-preview-categories">
                          {categories.map((cat) => (
                            <span key={`${previewId}-${cat}`}>{formatCategory(cat)}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      className="btn btn-danger btn-small"
                      type="button"
                      onClick={() => removeImportCandidate(previewId)}
                    >
                      Remove
                    </button>
                  </article>
                )
              })}
            </div>

            <div className="import-preview-footer">
              <button className="btn btn-secondary" type="button" onClick={closeImportPreview}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={confirmImportSelection}>
                Import Selected ({selectedImportCount})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isExportPreviewOpen ? (
        <div className="modal show" role="dialog" aria-modal="true" onClick={closeExportPreview}>
          <div className="modal-content export-preview-modal" onClick={(event) => event.stopPropagation()}>
            <span className="close" onClick={closeExportPreview}>
              &times;
            </span>
            <h2>Review Export</h2>
            <p className="import-preview-subtitle">
              Select which recipes to export. All recipes are selected by default.
            </p>

            <div className="import-preview-actions">
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setAllExportCandidates(true)}>
                Select All
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setAllExportCandidates(false)}>
                Clear All
              </button>
            </div>

            <div className="export-preview-list">
              {exportCandidates.map((candidate) => {
                const { recipe, previewId, selected } = candidate
                const categories = recipe.categories || []

                return (
                  <article key={previewId} className="export-preview-item">
                    <label className="import-preview-check">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleExportCandidate(previewId)}
                      />
                      <span>Include</span>
                    </label>
                    <div className="export-preview-content">
                      <h3>
                        {recipe.pinned ? <i className="fas fa-star" aria-hidden="true" /> : null}
                        {recipe.name}
                      </h3>
                      {recipe.url ? <a href={recipe.url}>{recipe.url}</a> : <p>Custom recipe</p>}
                      {categories.length > 0 ? (
                        <div className="import-preview-categories">
                          {categories.map((cat) => (
                            <span key={`${previewId}-${cat}`}>{formatCategory(cat)}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="import-preview-footer">
              <button className="btn btn-secondary" type="button" onClick={closeExportPreview}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={confirmExportSelection}>
                Export Selected ({selectedExportCount})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isShoppingListOpen ? (
        <div className="modal show" role="dialog" aria-modal="true" onClick={closeShoppingListBuilder}>
          <div className="modal-content shopping-list-modal" onClick={(event) => event.stopPropagation()}>
            <span className="close" onClick={closeShoppingListBuilder}>
              &times;
            </span>
            <h2>Shopping List Builder</h2>
            <p className="import-preview-subtitle">
              Select recipes and get safe combined totals by parsed quantity and unit. Ambiguous entries appear in
              the Needs Review section.
            </p>

            <div className="import-preview-actions">
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setAllShoppingCandidates(true)}>
                Select All Recipes
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={() => setAllShoppingCandidates(false)}>
                Clear All Recipes
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={clearShoppingChecklist}>
                Uncheck All Ingredients
              </button>
              <button className="btn btn-secondary btn-small" type="button" onClick={exportShoppingListText}>
                Export List
              </button>
              <span className="shopping-list-count">Recipes selected: {selectedShoppingCount}</span>
            </div>

            <div className="shopping-unit-toggle" role="group" aria-label="Preferred units">
              <button
                type="button"
                className={`btn btn-small ${shoppingUnitSystem === 'us' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShoppingUnitSystem('us')}
              >
                US Units
              </button>
              <button
                type="button"
                className={`btn btn-small ${shoppingUnitSystem === 'metric' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShoppingUnitSystem('metric')}
              >
                Metric Units
              </button>
            </div>

            <div className="shopping-list-layout">
              <section className="shopping-list-recipes">
                <h3>Recipes</h3>
                <div className="shopping-list-recipe-items">
                  {shoppingCandidates.map((candidate) => (
                    <label key={candidate.previewId} className="shopping-list-recipe-item">
                      <input
                        type="checkbox"
                        checked={candidate.selected}
                        onChange={() => toggleShoppingCandidate(candidate.previewId)}
                      />
                      <span>
                        {candidate.recipe.name}
                        <small>{(candidate.recipe.ingredients || []).length} ingredients</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="shopping-list-ingredients">
                <h3>Combined Totals ({combinedShoppingItems.length})</h3>
                {combinedShoppingItems.length > 0 ? (
                  <div className="shopping-list-ingredient-items">
                    {combinedShoppingItems.map((item) => (
                      <label key={item.key} className="shopping-list-ingredient-item">
                        <input
                          type="checkbox"
                          checked={Boolean(shoppingChecklist[item.key])}
                          onChange={() => toggleShoppingItemChecked(item.key)}
                        />
                        <span className={shoppingChecklist[item.key] ? 'shopping-list-item-checked' : ''}>
                          {item.amountLabel}
                          {item.sourceCount > 1 ? ` (${item.sourceCount} lines)` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="shopping-list-empty">Select at least one recipe with parseable ingredients.</p>
                )}

                {visibleUnresolvedItems.length > 0 ? (
                  <>
                    <h3 className="shopping-list-subtitle">Needs Review ({visibleUnresolvedItems.length})</h3>
                    <p className="shopping-merge-legend">
                      <span>
                        <strong>Left checkbox:</strong> Cross item off checklist.
                      </span>
                      <span>
                        <strong>Right checkbox:</strong> You can select multiple items and click "Merge Selected" to combine them into a single checklist entry. This is useful for manually merging similar items that couldn't be automatically combined.
                      </span>
                    </p>
                    <div className="shopping-manual-tools">
                      <input
                        type="text"
                        className="shopping-manual-input"
                        placeholder="Add you own label for merged items"
                        value={shoppingManualText}
                        onChange={(event) => setShoppingManualText(event.target.value)}
                      />
                      <button className="btn btn-secondary btn-small" type="button" onClick={createManualMergeGroup}>
                        Merge Selected
                      </button>
                    </div>
                    <div className="shopping-list-ingredient-items">
                      {visibleUnresolvedItems.map((item) => (
                        <label key={item.key} className="shopping-list-ingredient-item shopping-list-unresolved-item">
                          <input
                            type="checkbox"
                            checked={Boolean(shoppingChecklist[item.key])}
                            onChange={() => toggleShoppingItemChecked(item.key)}
                            title="Checklist done"
                          />
                          <input
                            type="checkbox"
                            className="shopping-merge-check"
                            checked={Boolean(shoppingMergeSelection[item.key])}
                            onChange={() => toggleShoppingMergeSelection(item.key)}
                            title="Select for manual merge"
                          />
                          <span className={shoppingChecklist[item.key] ? 'shopping-list-item-checked' : ''}>
                            {item.text}
                            {item.count > 1 ? ` (${item.count} recipes)` : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : null}

                {shoppingManualGroups.length > 0 ? (
                  <>
                    <h3 className="shopping-list-subtitle">Manual Merge Items ({shoppingManualGroups.length})</h3>
                    <div className="shopping-list-ingredient-items">
                      {shoppingManualGroups.map((group) => (
                        <div key={group.key} className="shopping-list-ingredient-item shopping-list-manual-item">
                          <input
                            type="checkbox"
                            checked={Boolean(shoppingChecklist[group.key])}
                            onChange={() => toggleShoppingItemChecked(group.key)}
                          />
                          {shoppingManualEditingKey === group.key ? (
                            <input
                              type="text"
                              className={`shopping-manual-item-input ${shoppingChecklist[group.key] ? 'shopping-list-item-checked' : ''}`}
                              value={shoppingManualEditDraft}
                              onChange={(event) => setShoppingManualEditDraft(event.target.value)}
                            />
                          ) : (
                            <span className={`shopping-manual-item-text ${shoppingChecklist[group.key] ? 'shopping-list-item-checked' : ''}`}>
                              {group.text}
                            </span>
                          )}
                          <span className="shopping-manual-item-count">
                            {group.count > 1 ? `${group.count} lines` : '1 line'}
                          </span>
                          <div className="shopping-manual-actions">
                            {shoppingManualEditingKey === group.key ? (
                              <>
                                <button
                                  className="btn btn-small btn-primary"
                                  type="button"
                                  onClick={() => saveEditingManualMergeGroup(group.key)}
                                >
                                  Save
                                </button>
                                <button className="btn btn-small btn-secondary" type="button" onClick={cancelEditingManualMergeGroup}>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-small btn-secondary"
                                type="button"
                                onClick={() => startEditingManualMergeGroup(group)}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              className="btn btn-small btn-secondary"
                              type="button"
                              onClick={() => splitManualMergeGroup(group.key)}
                            >
                              Split
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            </div>

            <div className="import-preview-footer">
              <button className="btn btn-secondary" type="button" onClick={closeShoppingListBuilder}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2026 Recipe Collector. Made with <i className="fas fa-heart" /> for Quinci.
          </p>
        </div>
      </footer>

      {showInstallBtn && !isModalOpen && !isImportPreviewOpen && !isExportPreviewOpen && !isShoppingListOpen && !focusedRecipe ? (
        <button id="pwaInstallBtn" className="btn btn-secondary pwa-install-btn" type="button" onClick={handleInstallClick}>
          <i className="fas fa-download" />
          Install App
        </button>
      ) : null}

      {showSwUpdateBanner ? (
        <div id="swUpdateBanner" className="sw-update-banner">
          <div className="sw-update-message">New version available</div>
          <button className="btn btn-primary" type="button" onClick={triggerSwUpdate}>
            Update now
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setShowSwUpdateBanner(false)}>
            Later
          </button>
        </div>
      ) : null}

      {showBackToTop && !showInstallBtn && !showSwUpdateBanner && !isModalOpen && !isImportPreviewOpen && !isExportPreviewOpen && !isShoppingListOpen && !focusedRecipe ? (
        <button className="btn btn-primary back-to-top-btn" type="button" onClick={scrollToTop} aria-label="Back to top">
          <i className="fas fa-arrow-up" />
          <span>Top</span>
        </button>
      ) : null}

      <div className="messages-wrap">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            {message.text}
          </div>
        ))}
      </div>
    </>
  )
}

export default App
