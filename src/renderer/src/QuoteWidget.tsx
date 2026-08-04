import { useEffect, useMemo, useState } from 'react'
import { GripHorizontal, Quote, X } from 'lucide-react'
import { dailyQuoteForDate } from '../../shared/quotes'
import { createDefaultPreferences, type AppPreferences } from '../../shared/settings'

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
        : 'PERSONAL WORD'
  const attribution =
    quote.attribution.trim() || (quote.mode === 'daily' ? `KAIRO · ${formattedDate()}` : '')

  return (
    <main className="widget-shell quote-widget-shell">
      <div className="widget-handle">
        <span lang="ja">改</span>
        <GripHorizontal size={14} />
        <button aria-label="Close widget" onClick={() => void window.kairo.widget.close('quote')}>
          <X size={13} />
        </button>
      </div>

      <div className="quote-widget-mark">
        <Quote size={18} />
      </div>
      <p className="eyebrow">{label}</p>
      <blockquote>{content}</blockquote>
      {attribution && <cite>{attribution}</cite>}
      <footer>
        <span />A thought worth returning to.
      </footer>
    </main>
  )
}
