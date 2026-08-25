import { useEffect, useMemo, useState } from 'react'
import { Download, GripHorizontal, Quote, Settings, X } from 'lucide-react'
import { dailyQuoteForDate } from '../../shared/quotes'
import { createDefaultPreferences, type AppPreferences } from '../../shared/settings'
import { WidgetQuickSettings } from './WidgetQuickSettings'

const today = new Date().toISOString().slice(0, 10)

function formattedDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date())
}

export function QuoteWidget(): React.JSX.Element {
  const [preferences, setPreferences] = useState<AppPreferences>(createDefaultPreferences)
  const [showSettings, setShowSettings] = useState(false)
  const quote = preferences.quoteWidget

  useEffect(() => {
    void window.kairo.settings.get().then(setPreferences)
    return window.kairo.settings.onUpdated(setPreferences)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.style.colorScheme = preferences.theme === 'ivory' ? 'light' : 'dark'
    document.documentElement.dataset.widgetSize = quote.size
    document.documentElement.dataset.widgetTranslucent = String(quote.translucent)
    document.documentElement.dataset.widgetBlur = String(quote.blur)
    document.documentElement.style.setProperty(
      '--widget-background-opacity',
      `${Math.round(quote.backgroundOpacity * 100)}%`
    )
    document.documentElement.style.setProperty(
      '--widget-blur-intensity',
      `${quote.blurIntensity}px`
    )
  }, [
    preferences.theme,
    quote.backgroundOpacity,
    quote.blur,
    quote.blurIntensity,
    quote.size,
    quote.translucent
  ])

  const content = useMemo(() => {
    if (quote.mode === 'daily') return dailyQuoteForDate(today)
    return quote.customContent.trim() || 'Write something worth keeping within sight.'
  }, [quote.customContent, quote.mode])

  const label =
    quote.mode === 'daily'
      ? 'DAILY KAIZEN'
      : quote.mode === 'scripture'
        ? 'SCRIPTURE'
        : 'A WORD TO RETURN TO'
  const attribution =
    quote.attribution.trim() || (quote.mode === 'daily' ? `KAIRO · ${formattedDate()}` : '')

  const saveAsImage = async (): Promise<void> => {
    document.documentElement.dataset.exporting = 'true'
    try {
      await window.kairo.widget.saveQuoteImage()
    } finally {
      delete document.documentElement.dataset.exporting
    }
  }

  return (
    <main className="widget-shell quote-widget-shell">
      <div className="widget-handle">
        <span lang="ja">改</span>
        <GripHorizontal size={14} />
        <div className="widget-handle-actions">
          <button
            aria-label="Open quote widget settings"
            onClick={() => setShowSettings((visible) => !visible)}
          >
            <Settings size={12} />
          </button>
          <button aria-label="Save quote as image" onClick={() => void saveAsImage()}>
            <Download size={12} />
          </button>
          <button aria-label="Close widget" onClick={() => void window.kairo.widget.close('quote')}>
            <X size={13} />
          </button>
        </div>
      </div>

      {showSettings && (
        <WidgetQuickSettings
          kind="quote"
          preferences={preferences}
          onChange={setPreferences}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="widget-scaled-content">
        <div className="quote-widget-mark">
          <Quote size={18} />
        </div>
        <p className="eyebrow">{label}</p>
        <blockquote>{content}</blockquote>
        {attribution && <cite>{attribution}</cite>}
        <footer>
          <span />A thought worth returning to.
        </footer>
      </div>
    </main>
  )
}
