import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource/instrument-serif'
import './styles.css'
import { App } from './App'
import { ChecklistWidget } from './ChecklistWidget'

const isWidget = new URLSearchParams(window.location.search).get('view') === 'widget'
if (isWidget) document.documentElement.dataset.window = 'widget'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isWidget ? <ChecklistWidget /> : <App />}</React.StrictMode>
)
