import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import type { AppPreferences, WidgetKind, WidgetPreferences } from '../../shared/settings'

type AppearancePatch = Partial<
  Pick<
    WidgetPreferences,
    'size' | 'alwaysOnDisplay' | 'alwaysOnTop' | 'blur' | 'blurIntensity' | 'backgroundOpacity'
  >
>

export function WidgetQuickSettings({
  kind,
  preferences,
  onChange,
  onClose
}: {
  kind: WidgetKind
  preferences: AppPreferences
  onChange(preferences: AppPreferences): void
  onClose(): void
}): React.JSX.Element {
  const widget = kind === 'checklist' ? preferences.widget : preferences.quoteWidget
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    []
  )

  const update = (patch: AppearancePatch, delayed = false): void => {
    const next =
      kind === 'checklist'
        ? { ...preferences, widget: { ...preferences.widget, ...patch } }
        : { ...preferences, quoteWidget: { ...preferences.quoteWidget, ...patch } }
    onChange(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (delayed) {
      saveTimer.current = setTimeout(() => void window.kairo.settings.save(next), 140)
    } else {
      void window.kairo.settings.save(next)
    }
  }

  return (
    <section className="widget-quick-settings">
      <header>
        <div>
          <p className="eyebrow">WIDGET SETTINGS</p>
          <h2>{kind === 'checklist' ? 'Daily Checklist' : 'Daily Quote'}</h2>
        </div>
        <button aria-label="Close settings" onClick={onClose}>
          <X size={14} />
        </button>
      </header>

      <div className="quick-size-options">
        {(['compact', 'standard', 'expanded'] as const).map((size) => (
          <button
            className={widget.size === size ? 'active' : ''}
            key={size}
            onClick={() => update({ size })}
          >
            {size}
            {widget.size === size && <Check size={10} />}
          </button>
        ))}
      </div>

      <QuickToggle
        label="Always on desktop"
        checked={widget.alwaysOnDisplay}
        onChange={(value) => update({ alwaysOnDisplay: value })}
      />
      <QuickToggle
        label="Display over all windows"
        checked={widget.alwaysOnTop}
        onChange={(value) => update({ alwaysOnTop: value })}
      />
      <QuickToggle
        label="Backdrop blur"
        checked={widget.blur}
        onChange={(value) => update({ blur: value })}
      />

      <QuickRange
        label="Blur"
        value={widget.blurIntensity}
        min={0}
        max={40}
        suffix="px"
        disabled={!widget.blur}
        onChange={(value) => update({ blurIntensity: value }, true)}
      />
      <QuickRange
        label="Background"
        value={Math.round(widget.backgroundOpacity * 100)}
        min={20}
        max={100}
        suffix="%"
        onChange={(value) => update({ backgroundOpacity: value / 100 }, true)}
      />
    </section>
  )
}

function QuickToggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange(value: boolean): void
}): React.JSX.Element {
  return (
    <button
      className="quick-toggle"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <i className={checked ? 'active' : ''}>
        <span />
      </i>
    </button>
  )
}

function QuickRange({
  label,
  value,
  min,
  max,
  suffix,
  disabled = false,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  disabled?: boolean
  onChange(value: number): void
}): React.JSX.Element {
  return (
    <label className={`quick-range ${disabled ? 'disabled' : ''}`}>
      <span>
        <strong>{label}</strong>
        <small>
          {value}
          {suffix}
        </small>
      </span>
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
