import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
// Fonts served from our own site (no extra trip to Google before the page shows).
// Only the weights the design uses, English letters only (the ₹ sign uses the
// phone's own font, which saves ~70 KB of extra font files per page).
import '@fontsource/inter/latin-300.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/cormorant-garamond/latin-300.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import './index.css'

// Wake the backend as early as possible (free Render servers sleep when idle)
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
fetch(`${API}/health`).catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
