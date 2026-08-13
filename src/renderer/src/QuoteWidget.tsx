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
        : 'PERSONAL WORD'
  const attribution =
    quote.attribution.trim() || (quote.mode === 'daily' ? `KAIRO · ${formattedDate()}` : '')

  const saveAsImage = (): void => {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 900
    const context = canvas.getContext('2d')
    if (!context) return
    const styles = getComputedStyle(document.documentElement)
    context.fillStyle = styles.getPropertyValue('--theme-bg').trim() || '#0b0b0a'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = styles.getPropertyValue('--theme-line').trim() || '#292823'
    context.strokeRect(55, 55, canvas.width - 110, canvas.height - 110)
    context.fillStyle = styles.getPropertyValue('--theme-accent').trim() || '#b89550'
    context.font = '700 26px Arial'
    context.fillText('改  KAIRO', 110, 150)
    context.fillStyle = styles.getPropertyValue('--theme-muted').trim() || '#85827a'
    context.font = '700 20px Arial'
    context.fillText(label, 110, 225)
    context.fillStyle = styles.getPropertyValue('--theme-text').trim() || '#eeeae0'
    context.font = '400 48px Georgia'
    const words = content.split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (context.measureText(candidate).width > 1120 && line) {
        lines.push(line)
        line = word
      } else line = candidate
    }
    if (line) lines.push(line)
    lines.slice(0, 6).forEach((item, index) => context.fillText(item, 110, 350 + index * 68))
    if (attribution) {
      context.fillStyle = styles.getPropertyValue('--theme-muted').trim() || '#85827a'
      context.font = '400 22px Arial'
      context.fillText(attribution, 110, 790)
    }
    void window.kairo.widget.saveQuoteImage(canvas.toDataURL('image/png'))
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
          <button aria-label="Save quote as image" onClick={saveAsImage}>
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
