import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'  // ✅ CHANGE: Import App instead of VASAInterface
import './App.css'

createRoot(document.getElementById('root')).render(<App />)  // ✅ CHANGE: Render App instead of VASAInterface
