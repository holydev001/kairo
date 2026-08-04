import { Check, Eye, Layers3, MonitorUp, PanelsTopLeft, Sparkles } from 'lucide-react'
import type { AppPreferences, WidgetPreferences } from '../../shared/settings'

const sizes: Array<{
  id: WidgetPreferences['size']
  name: string
  dimensions: string
}> = [
  { id: 'compact', name: 'Compact', dimensions: '300 × 330' },
  { id: 'standard', name: 'Standard', dimensions: '370 × 480' },
  { id: 'expanded', name: 'Expanded', dimensions: '440 × 620' }
]

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
  const widget = preferences.widget
  const update = (patch: Partial<WidgetPreferences>): void => {
    onChange({ ...preferences, widget: { ...widget, ...patch } })
  }

  const launchWidget = async (): Promise<void> => {
    await window.kairo.settings.save(preferences)
    await window.kairo.widget.open('checklist')
  }

  return (
    <div className="widget-studio" hidden={hidden}>
      <header className="widget-studio-header">
        <div>
          <p className="eyebrow">DESKTOP WIDGET</p>
          <h1>Keep the day within sight.</h1>
          <p>Shape a quiet checklist that belongs on your desktop—not another app window.</p>
        </div>
        <button className="settings-primary" onClick={() => void launchWidget()}>
          <MonitorUp size={15} />
          Launch widget
        </button>
      </header>

      <div className="widget-studio-layout">
        <div className="widget-config">
          <section>
            <div className="widget-config-heading">
              <PanelsTopLeft size={17} />
              <div>
                <p className="eyebrow">SIZE</p>
                <h2>Choose its footprint.</h2>
              </div>
            </div>
            <div className="widget-size-options">
              {sizes.map((size) => (
                <button
                  className={widget.size === size.id ? 'selected' : ''}
                  key={size.id}
                  onClick={() => update({ size: size.id })}
                >
                  <i className={`size-shape ${size.id}`} />
                  <span>
                    <strong>{size.name}</strong>
                    <small>{size.dimensions}</small>
                  </span>
                  {widget.size === size.id && <Check size={13} />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="widget-config-heading">
              <Layers3 size={17} />
              <div>
                <p className="eyebrow">PRESENCE</p>
                <h2>Decide how it sits.</h2>
              </div>
            </div>
            <div className="widget-toggles">
              <WidgetToggle
                label="Always on display"
                detail="Restore this widget whenever Kairo starts."
                checked={widget.alwaysOnDisplay}
                onChange={(checked) => update({ alwaysOnDisplay: checked })}
              />
              <WidgetToggle
                label="Display over all windows"
                detail="Keep it floating above your other applications."
                checked={widget.alwaysOnTop}
                onChange={(checked) => update({ alwaysOnTop: checked })}
              />
              <WidgetToggle
                label="Translucent surface"
                detail="Let a hint of the desktop pass through."
                checked={widget.translucent}
                onChange={(checked) => update({ translucent: checked })}
              />
              <WidgetToggle
                label="Backdrop blur"
                detail="Soften whatever sits behind the widget."
                checked={widget.blur}
                onChange={(checked) => update({ blur: checked })}
              />
            </div>
            <label className="widget-opacity">
              <span>
                <strong>Window opacity</strong>
                <small>{Math.round(widget.opacity * 100)}%</small>
              </span>
              <input
                type="range"
                min="65"
                max="100"
                value={Math.round(widget.opacity * 100)}
                onChange={(event) => update({ opacity: Number(event.target.value) / 100 })}
              />
            </label>
            <label className="widget-opacity">
              <span>
                <strong>Background opacity</strong>
                <small>{Math.round(widget.backgroundOpacity * 100)}%</small>
              </span>
              <p>Adjust the surface only. Text, icons and controls remain fully clear.</p>
              <input
                type="range"
                min="20"
                max="100"
                value={Math.round(widget.backgroundOpacity * 100)}
                onChange={(event) =>
                  update({ backgroundOpacity: Number(event.target.value) / 100 })
                }
              />
            </label>
            <label className={`widget-opacity ${widget.blur ? '' : 'disabled'}`}>
              <span>
                <strong>Backdrop blur intensity</strong>
                <small>{widget.blurIntensity}px</small>
              </span>
              <input
                type="range"
                min="0"
                max="40"
                value={widget.blurIntensity}
                disabled={!widget.blur}
                onChange={(event) => update({ blurIntensity: Number(event.target.value) })}
              />
            </label>
          </section>

          <section>
            <div className="widget-config-heading">
              <Eye size={17} />
              <div>
                <p className="eyebrow">CONTENT</p>
                <h2>Keep only what helps.</h2>
              </div>
            </div>
            <div className="widget-toggles">
              <WidgetToggle
                label="Show today’s intention"
                detail="Keep the purpose of the day in view."
                checked={widget.showIntention}
                onChange={(checked) => update({ showIntention: checked })}
              />
              <WidgetToggle
                label="Show commitment details"
                detail="Include targets and supporting notes."
                checked={widget.showDetails}
                onChange={(checked) => update({ showDetails: checked })}
              />
            </div>
          </section>
        </div>

        <aside className="widget-preview">
          <div className="widget-preview-heading">
            <Sparkles size={14} />
            LIVE CHARACTER
          </div>
          <div
            className={`widget-preview-card ${widget.translucent ? 'translucent' : ''}`}
            style={
              {
                '--preview-background-opacity': `${Math.round(widget.backgroundOpacity * 100)}%`,
                '--preview-blur': `${widget.blurIntensity}px`,
                opacity: widget.opacity
              } as React.CSSProperties
            }
          >
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
          </div>
          <p>The widget inherits your active Kairo theme automatically.</p>
        </aside>
      </div>
    </div>
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
