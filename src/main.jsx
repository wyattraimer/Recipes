import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'
import App from './App.jsx'

const hideAppSplash = () => {
  const splash = document.getElementById('app-splash')
  const root = document.getElementById('root')
  if (!splash) return

  const hideNow = () => {
    splash.setAttribute('data-hidden', 'true')
    setTimeout(() => splash.remove(), 260)
  }

  const splashDeadline = window.setTimeout(hideNow, 2200)

  const tryHideAfterPaint = () => {
    const hasRenderedContent = root && root.childElementCount > 0
    if (!hasRenderedContent) {
      return
    }

    window.clearTimeout(splashDeadline)
    requestAnimationFrame(() => {
      requestAnimationFrame(hideNow)
    })
  }

  tryHideAfterPaint()

  if (root && root.childElementCount === 0) {
    const observer = new MutationObserver(() => {
      tryHideAfterPaint()
      if (root.childElementCount > 0) {
        observer.disconnect()
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    window.setTimeout(() => observer.disconnect(), 3000)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

hideAppSplash()
