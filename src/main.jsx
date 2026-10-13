import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
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
