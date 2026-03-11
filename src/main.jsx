import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const hideAppSplash = () => {
  const splash = document.getElementById('app-splash')
  if (!splash) return

  requestAnimationFrame(() => {
    splash.setAttribute('data-hidden', 'true')
    setTimeout(() => splash.remove(), 260)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

hideAppSplash()
