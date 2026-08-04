import { useEffect, useMemo, useState } from 'react'
import { Check, Circle, GripHorizontal, LoaderCircle, Settings, X } from 'lucide-react'
import { createEmptyEntry, type DailyEntry } from '../../shared/journal'
import { createDefaultPreferences, type AppPreferences } from '../../shared/settings'
import { CommitmentIcon } from './commitment-icons'

const today = new Date().toISOString().slice(0, 10)

function widgetDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date())
}

export function ChecklistWidget(): React.JSX.Element {
  const [entry, setEntry] = useState<DailyEntry>(() => createEmptyEntry(today))
  const [preferences, setPreferences] = useState<AppPreferences>(createDefaultPreferences)
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')

  const commitments = useMemo(
    () =>
      entry.commitmentCategories.flatMap((category) =>
        category.commitments.map((commitment) => ({
          ...commitment,
          categoryId: category.id,
          categoryName: category.name
        }))
      ),
    [entry.commitmentCategories]
  )
  const completed = commitments.filter((commitment) => commitment.completed).length
  const progress = commitments.length ? Math.round((completed / commitments.length) * 100) : 0

  useEffect(() => {
    void Promise.all([window.kairo.journal.get(today), window.kairo.settings.get()])
      .then(([dailyEntry, appPreferences]) => {
        setEntry(dailyEntry)
        setPreferences(appPreferences)
        setStatus('saved')
      })
      .catch(() => setStatus('error'))

    const stopJournalUpdates = window.kairo.journal.onUpdated((dailyEntry) => {
      if (dailyEntry.date === today) setEntry(dailyEntry)
    })
    const stopSettingsUpdates = window.kairo.settings.onUpdated(setPreferences)
    return () => {
      stopJournalUpdates()
      stopSettingsUpdates()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.style.colorScheme = preferences.theme === 'ivory' ? 'light' : 'dark'
    document.documentElement.dataset.widgetSize = preferences.widget.size
    document.documentElement.dataset.widgetTranslucent = String(preferences.widget.translucent)
    document.documentElement.dataset.widgetBlur = String(preferences.widget.blur)
    document.documentElement.style.setProperty(
      '--widget-background-opacity',
      `${Math.round(preferences.widget.backgroundOpacity * 100)}%`
    )
    document.documentElement.style.setProperty(
      '--widget-blur-intensity',
      `${preferences.widget.blurIntensity}px`
    )
  }, [
    preferences.widget.backgroundOpacity,
    preferences.theme,
    preferences.widget.blur,
    preferences.widget.blurIntensity,
    preferences.widget.size,
    preferences.widget.translucent
  ])

  const toggleCommitment = async (
    categoryId: string,
    commitmentId: string,
    completedState: boolean
  ): Promise<void> => {
    const nextEntry = {
      ...entry,
      commitmentCategories: entry.commitmentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              commitments: category.commitments.map((commitment) =>
                commitment.id === commitmentId
                  ? { ...commitment, completed: completedState }
                  : commitment
              )
            }
          : category
      )
    }
    setEntry(nextEntry)
    setStatus('saving')
    try {
      const saved = await window.kairo.journal.save(nextEntry)
      setEntry(saved)
      setStatus('saved')
    } catch {
      setEntry(entry)
      setStatus('error')
    }
  }

  return (
    <main className="widget-shell">
      <div className="widget-handle">
        <span lang="ja">改</span>
        <GripHorizontal size={14} />
        <div className="widget-handle-actions">
          <button
            aria-label="Open checklist widget settings"
            onClick={() => void window.kairo.widget.openSettings('checklist')}
          >
            <Settings size={12} />
          </button>
          <button
            aria-label="Close widget"
            onClick={() => void window.kairo.widget.close('checklist')}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <header className="widget-header">
        <div>
          <p className="eyebrow">{widgetDate().toUpperCase()}</p>
          <h1>Today’s commitments.</h1>
        </div>
        <span className={`save-state ${status}`}>
          {(status === 'loading' || status === 'saving') && <LoaderCircle size={11} />}
          {status === 'loading' ? 'Opening' : status}
        </span>
      </header>

      <section className="widget-progress">
        <div>
          <span>{completed} KEPT</span>
          <span>{commitments.length - completed} REMAIN</span>
        </div>
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        <strong>{progress}%</strong>
      </section>

      {preferences.widget.showIntention && entry.intention.trim() && (
        <section className="widget-intention">
          <p className="eyebrow">TODAY’S INTENTION</p>
          <blockquote>{entry.intention}</blockquote>
        </section>
      )}

      <section className="widget-checklist">
        {commitments.length === 0 ? (
          <div className="widget-empty">
            <Circle size={20} />
            <p>No commitments for today.</p>
          </div>
        ) : (
          commitments.map((commitment) => (
            <article className={commitment.completed ? 'complete' : ''} key={commitment.id}>
              <CommitmentIcon name={commitment.icon} size={17} />
              <span>
                <small>{commitment.categoryName.toUpperCase()}</small>
                <strong>{commitment.title}</strong>
                {preferences.widget.showDetails && (commitment.detail || commitment.target) && (
                  <i>{[commitment.detail, commitment.target].filter(Boolean).join(' · ')}</i>
                )}
              </span>
              <button
                aria-label={`Mark ${commitment.title} ${commitment.completed ? 'incomplete' : 'complete'}`}
                onClick={() =>
                  void toggleCommitment(commitment.categoryId, commitment.id, !commitment.completed)
                }
              >
                {commitment.completed ? <Check size={13} /> : <Circle size={18} />}
              </button>
            </article>
          ))
        )}
      </section>

      <footer className="widget-footer">
        <span />
        Small actions. Kept daily.
      </footer>
    </main>
  )
}
