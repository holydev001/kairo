import { useState } from 'react'
import {
  BookOpen,
  Check,
  Eye,
  Layers3,
  MonitorUp,
  PanelsTopLeft,
  Quote,
  Sparkles
} from 'lucide-react'
import type {
  AppPreferences,
  QuoteWidgetPreferences,
  WidgetKind,
  WidgetPreferences
} from '../../shared/settings'

const checklistSizes: Record<WidgetPreferences['size'], string> = {
  compact: '296 × 384',
  standard: '370 × 480',
  expanded: '440 × 620'
}

const quoteSizes: Record<WidgetPreferences['size'], string> = {
  compact: '304 × 240',
  standard: '380 × 300',
  expanded: '440 × 380'
}

const sizes: Array<{ id: WidgetPreferences['size']; name: string }> = [
  { id: 'compact', name: 'Compact' },
  { id: 'standard', name: 'Standard' },
  { id: 'expanded', name: 'Expanded' }
]

type AppearancePatch = Partial<
  Pick<
    WidgetPreferences,
    | 'size'
    | 'alwaysOnDisplay'
    | 'alwaysOnTop'
    | 'translucent'
    | 'blur'
    | 'blurIntensity'
    | 'opacity'
    | 'backgroundOpacity'
  >
>

type WidgetStudioProps = {
  hidden: boolean
  preferences: AppPreferences
  onChange(preferences: AppPreferences): void
}

export function WidgetStudio({
  hidden,
  preferences,
  onChange
}: WidgetStudioProps): React.JSX.Element {
  const [activeWidget, setActiveWidget] = useState<WidgetKind>('checklist')
  const widget = activeWidget === 'checklist' ? preferences.widget : preferences.quoteWidget
  const dimensions = activeWidget === 'checklist' ? checklistSizes : quoteSizes

  const updateAppearance = (patch: AppearancePatch): void => {
    const normalizedPatch = patch.alwaysOnDisplay
      ? { ...patch, alwaysOnTop: false }
      : patch.alwaysOnTop
        ? { ...patch, alwaysOnDisplay: false }
        : patch
    if (activeWidget === 'checklist') {
      onChange({ ...preferences, widget: { ...preferences.widget, ...normalizedPatch } })
    } else {
      onChange({ ...preferences, quoteWidget: { ...preferences.quoteWidget, ...normalizedPatch } })
    }
  }

  const updateChecklist = (patch: Partial<WidgetPreferences>): void => {
    onChange({ ...preferences, widget: { ...preferences.widget, ...patch } })
  }

  const updateQuote = (patch: Partial<QuoteWidgetPreferences>): void => {
    onChange({ ...preferences, quoteWidget: { ...preferences.quoteWidget, ...patch } })
  }

  const launchWidget = async (): Promise<void> => {
    await window.kairo.settings.save(preferences)
    await window.kairo.widget.open(activeWidget)
  }

  return (
    <div className="widget-studio" hidden={hidden}>
      <header className="widget-studio-header">
        <div>
          <p className="eyebrow">DESKTOP WIDGETS</p>
          <h1>Keep what matters within sight.</h1>
          <p>Shape quiet desktop surfaces that feel like Kairo—not another open app window.</p>
        </div>
        <button className="settings-primary" onClick={() => void launchWidget()}>
          <MonitorUp size={15} />
          Launch {activeWidget === 'checklist' ? 'checklist' : 'quote'}
        </button>
      </header>

      <nav className="widget-kind-picker" aria-label="Choose a widget">
        <button
          className={activeWidget === 'checklist' ? 'active' : ''}
          onClick={() => setActiveWidget('checklist')}
        >
          <PanelsTopLeft size={16} />
          <span>
            <strong>Daily Checklist</strong>
            <small>Commitments and progress</small>
          </span>
        </button>
        <button
          className={activeWidget === 'quote' ? 'active' : ''}
          onClick={() => setActiveWidget('quote')}
        >
          <Quote size={16} />
          <span>
            <strong>Daily Quote</strong>
            <small>Kaizen, personal words or scripture</small>
          </span>
        </button>
      </nav>

      <div className="widget-studio-layout">
        <div className="widget-config">
          <section>
            <ConfigHeading
              icon={<PanelsTopLeft size={17} />}
              eyebrow="SIZE"
              title="Choose its footprint."
            />
            <div className="widget-size-options">
              {sizes.map((size) => (
                <button
                  className={widget.size === size.id ? 'selected' : ''}
                  key={size.id}
                  onClick={() => updateAppearance({ size: size.id })}
                >
                  <i className={`size-shape ${size.id}`} />
                  <span>
                    <strong>{size.name}</strong>
                    <small>{dimensions[size.id]}</small>
                  </span>
                  {widget.size === size.id && <Check size={13} />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <ConfigHeading
              icon={<Layers3 size={17} />}
              eyebrow="PRESENCE"
              title="Decide how it sits."
            />
            <div className="widget-toggles">
              <WidgetToggle
                label="Always on desktop"
                detail="Start with Windows, stay on the desktop layer, and never cover another app."
                checked={widget.alwaysOnDisplay}
                onChange={(checked) => updateAppearance({ alwaysOnDisplay: checked })}
              />
              <WidgetToggle
                label="Display over all windows"
                detail="Float above other applications until you turn this off."
                checked={widget.alwaysOnTop}
                onChange={(checked) => updateAppearance({ alwaysOnTop: checked })}
              />
              <WidgetToggle
                label="Translucent surface"
                detail="Let a controlled amount of the desktop pass through."
                checked={widget.translucent}
                onChange={(checked) => updateAppearance({ translucent: checked })}
              />
              <WidgetToggle
                label="Backdrop blur"
                detail="Soften whatever sits behind the widget."
                checked={widget.blur}
                onChange={(checked) => updateAppearance({ blur: checked })}
              />
            </div>
            <RangeControl
              label="Window opacity"
              detail="Fades the complete widget, including its content."
              value={Math.round(widget.opacity * 100)}
              min={65}
              max={100}
              suffix="%"
              onChange={(value) => updateAppearance({ opacity: value / 100 })}
            />
            <RangeControl
              label="Background opacity"
              detail="Adjusts only the surface. Content remains completely clear."
              value={Math.round(widget.backgroundOpacity * 100)}
              min={20}
              max={100}
              suffix="%"
              disabled={!widget.translucent}
              onChange={(value) => updateAppearance({ backgroundOpacity: value / 100 })}
            />
            <RangeControl
              label="Backdrop blur intensity"
              detail="Control how strongly the desktop behind it is softened."
              value={widget.blurIntensity}
              min={0}
              max={40}
              suffix="px"
              disabled={!widget.blur}
              onChange={(value) => updateAppearance({ blurIntensity: value })}
            />
          </section>

          <section>
            <ConfigHeading
              icon={activeWidget === 'checklist' ? <Eye size={17} /> : <BookOpen size={17} />}
              eyebrow="CONTENT"
              title={
                activeWidget === 'checklist' ? 'Keep only what helps.' : 'Choose what it carries.'
              }
            />
            {activeWidget === 'checklist' ? (
              <div className="widget-toggles">
                <WidgetToggle
                  label="Show today’s intention"
                  detail="Keep the purpose of the day in view."
                  checked={preferences.widget.showIntention}
                  onChange={(checked) => updateChecklist({ showIntention: checked })}
                />
                <WidgetToggle
                  label="Show commitment details"
                  detail="Include targets and supporting notes."
                  checked={preferences.widget.showDetails}
                  onChange={(checked) => updateChecklist({ showDetails: checked })}
                />
              </div>
            ) : (
              <QuoteControls quote={preferences.quoteWidget} update={updateQuote} />
            )}
          </section>
        </div>

        <aside className="widget-preview">
          <div className="widget-preview-heading">
            <Sparkles size={14} />
            LIVE CHARACTER
          </div>
          <div
            className={`widget-preview-card ${widget.translucent ? 'translucent' : ''} ${activeWidget === 'quote' ? 'quote-preview-card' : ''}`}
            style={
              {
                '--preview-background-opacity': `${Math.round(widget.backgroundOpacity * 100)}%`,
                '--preview-blur': `${widget.blurIntensity}px`,
                opacity: widget.opacity
              } as React.CSSProperties
            }
          >
            {activeWidget === 'checklist' ? (
              <>
                <p className="eyebrow">TODAY · 2 OF 3</p>
                <h3>Quiet progress.</h3>
                <div>
                  <Check size={10} /> Workout
                </div>
                <div>
                  <span /> Reading
                </div>
                <div>
                  <Check size={10} /> Scripture
                </div>
              </>
            ) : (
              <QuotePreview quote={preferences.quoteWidget} />
            )}
          </div>
          <p>The widget inherits your active Kairo theme automatically.</p>
        </aside>
      </div>
    </div>
  )
}

function ConfigHeading({
  icon,
  eyebrow,
  title
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
}): React.JSX.Element {
  return (
    <div className="widget-config-heading">
      {icon}
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

function QuoteControls({
  quote,
  update
}: {
  quote: QuoteWidgetPreferences
  update(patch: Partial<QuoteWidgetPreferences>): void
}): React.JSX.Element {
  return (
    <div className="quote-controls">
      <div className="quote-mode-options">
        {(
          [
            ['daily', 'Daily quote'],
            ['custom', 'Custom words'],
            ['scripture', 'Bible verse']
          ] as const
        ).map(([mode, label]) => (
          <button
            className={quote.mode === mode ? 'selected' : ''}
            key={mode}
            onClick={() => update({ mode })}
          >
            {label}
            {quote.mode === mode && <Check size={12} />}
          </button>
        ))}
      </div>
      {quote.mode !== 'daily' && (
        <>
          <label className="widget-content-field">
            <span>{quote.mode === 'scripture' ? 'VERSE' : 'CONTENT'}</span>
            <textarea
              rows={4}
              maxLength={500}
              placeholder={
                quote.mode === 'scripture'
                  ? 'Enter the verse text…'
                  : 'Write something worth seeing each day…'
              }
              value={quote.customContent}
              onChange={(event) => update({ customContent: event.target.value })}
            />
          </label>
          <label className="widget-content-field">
            <span>{quote.mode === 'scripture' ? 'REFERENCE' : 'ATTRIBUTION · OPTIONAL'}</span>
            <input
              maxLength={120}
              placeholder={quote.mode === 'scripture' ? 'Proverbs 3:5–6' : 'A name or source'}
              value={quote.attribution}
              onChange={(event) => update({ attribution: event.target.value })}
            />
          </label>
        </>
      )}
    </div>
  )
}

function QuotePreview({ quote }: { quote: QuoteWidgetPreferences }): React.JSX.Element {
  const content =
    quote.mode === 'daily'
      ? 'Small steps, repeated with intention, become transformation.'
      : quote.customContent.trim() || 'Your chosen words will live here.'
  const label =
    quote.mode === 'scripture'
      ? 'SCRIPTURE'
      : quote.mode === 'custom'
        ? 'PERSONAL WORD'
        : 'DAILY KAIZEN'
  return (
    <>
      <Quote size={16} />
      <p className="eyebrow">{label}</p>
      <blockquote>{content}</blockquote>
      {quote.attribution.trim() && <cite>{quote.attribution}</cite>}
    </>
  )
}

function RangeControl({
  label,
  detail,
  value,
  min,
  max,
  suffix,
  disabled = false,
  onChange
}: {
  label: string
  detail: string
  value: number
  min: number
  max: number
  suffix: string
  disabled?: boolean
  onChange(value: number): void
}): React.JSX.Element {
  return (
    <label className={`widget-opacity ${disabled ? 'disabled' : ''}`}>
      <span>
        <strong>{label}</strong>
        <small>
          {value}
          {suffix}
        </small>
      </span>
      <p>{detail}</p>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function WidgetToggle({
  label,
  detail,
  checked,
  onChange
}: {
  label: string
  detail: string
  checked: boolean
  onChange(checked: boolean): void
}): React.JSX.Element {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <i className={checked ? 'toggle-track active' : 'toggle-track'}>
        <span />
      </i>
    </button>
  )
}
