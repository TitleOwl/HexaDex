import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './responsive.css'
import { applyPerfMode } from './perfMode.js'

// Heavy effects (backdrop blur, many infinite animations) run smoothly on Apple
// GPUs but stutter on most Windows/Linux/low-end machines. Resolve the saved /
// auto-detected performance mode before first paint.
applyPerfMode()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
