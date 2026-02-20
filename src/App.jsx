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
    categories: ['dessert'],
    notes: 'The perfect chewy cookie recipe',
    type: 'url',
  },
  {
    id: 1002,
    name: 'Homemade Pizza Dough',
    url: 'https://www.seriouseats.com/homemade-pizza-dough-recipe',
    categories: ['dinner'],
    notes: 'Crispy crust, fluffy inside',
    type: 'url',
  },
  {
    id: 1003,
    name: 'Fluffy Pancakes',
    url: 'https://www.foodnetwork.com/recipes/food-network-kitchen/fluffy-pancakes-3364281',
    categories: ['breakfast'],
    notes: 'Weekend breakfast favorite',
    type: 'url',
  },
]

const STORAGE_KEY = 'recipeBookmarks'
const THEME_KEY = 'recipeTheme'
const MEAL_PLAN_KEY = 'recipeMealPlan'

const MEAL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner']

const emptyForm = {
  name: '',
  url: '',
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
  const [currentEditingId, setCurrentEditingId] = useState(null)
  const [currentRecipeType, setCurrentRecipeType] = useState('url')
  const [form, setForm] = useState(emptyForm)
  const [highlightedId, setHighlightedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [showSwUpdateBanner, setShowSwUpdateBanner] = useState(false)
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    return savedTheme === 'dark' ? 'dark' : 'light'
  })
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false)
  const [importCandidates, setImportCandidates] = useState([])
  const [importSummary, setImportSummary] = useState(null)
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(mealPlan))
  }, [mealPlan])

  useEffect(() => {
    document.body.dataset.theme = theme
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
    if (!('serviceWorker' in navigator)) {
      return undefined
    }

    const onControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      swRegistrationRef.current = registration

      if (registration.waiting) {
        setShowSwUpdateBanner(true)
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing
        if (!installingWorker) {
          return
        }
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowSwUpdateBanner(true)
          }
        })
      })
    })

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        setIsImportPreviewOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function showMessage(text, type = 'info') {
    const id = Date.now() + Math.random()
    setMessages((prev) => [...prev, { id, text, type }])
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((message) => message.id !== id))
    }, 3000)
  }

  function closeImportPreview() {
    setIsImportPreviewOpen(false)
    setImportCandidates([])
    setImportSummary(null)
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  function openModal(recipe = null) {
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

      recipeData = {
        name: form.name.trim(),
        url: form.url.trim(),
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
      const isCustomRecipe = selectedRecipe.type === 'custom' || (!selectedRecipe.url && selectedRecipe.ingredients)
      if (isCustomRecipe) {
        window.alert(`Random recipe selected: "${selectedRecipe.name}"`)
      } else {
        const shouldVisit = window.confirm(
          `Random recipe selected: "${selectedRecipe.name}"\n\nWould you like to visit this recipe?`,
        )
        if (shouldVisit) {
          visitRecipe(selectedRecipe.url)
        }
      }
      setHighlightedId(null)
    }, 600)
  }

  function exportRecipes() {
    if (recipes.length === 0) {
      window.alert('No recipes to export! Add some recipes first.')
      return
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      recipes,
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
    showMessage(`Exported ${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} successfully!`, 'success')
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

  return (
    <>
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
            <div className="controls-actions">
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

              <button className="btn btn-primary" type="button" onClick={() => openModal()}>
                <i className="fas fa-plus" />
                Add Recipe
              </button>
              <button className="btn btn-secondary" type="button" onClick={randomizeRecipe}>
                <i className="fas fa-dice" />
                Random Recipe
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
              <button className="btn btn-danger btn-small" type="button" onClick={deleteAllRecipes}>
                <i className="fas fa-trash-alt" />
                Delete All
              </button>
              <button
                className={`btn btn-small ${showPinnedOnly ? 'btn-primary' : 'btn-secondary'}`}
                type="button"
                onClick={() => setShowPinnedOnly((prev) => !prev)}
              >
                <i className={`fas ${showPinnedOnly ? 'fa-star' : 'fa-star-half-alt'}`} />
                {showPinnedOnly ? 'Pinned Only' : 'All + Pinned'}
              </button>
            </div>

            <div className="controls-filters">
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
          </section>

          {activeView === 'recipes' ? (
            filteredRecipes.length > 0 ? (
              <section className="recipe-grid">
                {filteredRecipes.map((recipe) => {
                  const categories = recipe.categories || (recipe.category ? [recipe.category] : [])
                  const isCustomRecipe =
                    recipe.type === 'custom' || (!recipe.url && Array.isArray(recipe.ingredients))

                  return (
                    <article
                      key={recipe.id}
                      className={`recipe-card ${highlightedId === recipe.id ? 'highlighted' : ''}`}
                      data-recipe-id={recipe.id}
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
                        {!isCustomRecipe && recipe.url ? (
                          <a href={recipe.url} className="recipe-url" target="_blank" rel="noreferrer">
                            {recipe.url}
                          </a>
                        ) : null}

                        {recipe.notes ? <p className="recipe-notes">{recipe.notes}</p> : null}

                        {isCustomRecipe ? (
                          <>
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
                          </>
                        ) : null}

                        <div className="recipe-actions">
                          {!isCustomRecipe && recipe.url ? (
                            <>
                              <button
                                className="btn btn-small btn-visit"
                                type="button"
                                onClick={() => visitRecipe(recipe.url)}
                              >
                                <i className="fas fa-external-link-alt" />
                                Visit
                              </button>
                              <button
                                className="btn btn-small btn-copy"
                                type="button"
                                onClick={() => copyRecipeUrl(recipe.url)}
                              >
                                <i className="fas fa-copy" />
                                Copy URL
                              </button>
                            </>
                          ) : null}
                          <button
                            className={`btn btn-small ${recipe.pinned ? 'btn-pin-active' : 'btn-pin'}`}
                            type="button"
                            onClick={() => togglePinnedRecipe(recipe.id)}
                          >
                            <i className={`fas ${recipe.pinned ? 'fa-star' : 'fa-star-half-alt'}`} />
                            {recipe.pinned ? 'Pinned' : 'Pin'}
                          </button>
                          <button className="btn btn-small btn-primary" type="button" onClick={() => openModal(recipe)}>
                            <i className="fas fa-edit" />
                            Edit
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            type="button"
                            onClick={() => handleDeleteRecipe(recipe.id)}
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

      <footer className="footer">
        <div className="container">
          <p>
            &copy; 2026 Recipe Collector. Made with <i className="fas fa-heart" /> for food lovers.
          </p>
        </div>
      </footer>

      {showInstallBtn && !isModalOpen ? (
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
