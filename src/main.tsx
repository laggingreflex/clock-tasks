import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OptionsContext } from './hooks/OptionsContext'

function getReadOnlyFromURL(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('readonly')) return false
    const val = params.get('readonly')
    if (val === null) return true
    const normalized = val.toLowerCase()
    return normalized === '' || normalized === '1' || normalized === 'true' || normalized === 'yes'
  } catch {
    return false
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsContext.Provider value={{ readOnly: getReadOnlyFromURL() }}>
      <App />
    </OptionsContext.Provider>
  </StrictMode>,
)
