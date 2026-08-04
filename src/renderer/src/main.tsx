import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource/instrument-serif'
import './styles.css'
import { App } from './App'
import { ChecklistWidget } from './ChecklistWidget'
import { QuoteWidget } from './QuoteWidget'

const widgetKind = new URLSearchParams(window.location.search).get('widget')
if (widgetKind) document.documentElement.dataset.window = 'widget'

const view =
  widgetKind === 'checklist' ? (
    <ChecklistWidget />
  ) : widgetKind === 'quote' ? (
    <QuoteWidget />
  ) : (
    <App />
  )

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{view}</React.StrictMode>
)
