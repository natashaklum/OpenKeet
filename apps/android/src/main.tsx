import React from 'react'
import { createRoot } from 'react-dom/client'
import { AndroidApp } from './App.js'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AndroidApp />
  </React.StrictMode>
)
