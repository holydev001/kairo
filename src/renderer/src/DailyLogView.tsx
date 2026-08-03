import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Circle, LoaderCircle } from 'lucide-react'
import { createEmptyEntry, type DailyEntry } from '../../shared/journal'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function shiftDate(value: string, amount: number): string {
  const date = dateFromKey(value)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', options).format(dateFromKey(value))
}

export function DailyLogView({ hidden }: { hidden: boolean }): React.JSX.Element {
  const today = toDateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [entry, setEntry] = useState<DailyEntry>(() => createEmptyEntry(today))
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (hidden) return
    setHydrated(false)
    setStatus('loading')
    void window.kairo.journal
      .get(selectedDate)
      .then((value) => {
        setEntry(value)
        setHydrated(true)
        setStatus('saved')
      })
      .catch(() => setStatus('error'))
  }, [hidden, selectedDate])

  useEffect(() => {
    if (!hydrated) return
    setStatus('saving')
    const timeout = window.setTimeout(() => {
      void window.kairo.journal
        .save(entry)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [entry, hydrated])

  const updatePriority = (
    index: number,
    patch: Partial<DailyEntry['priorities'][number]>
  ): void => {
    setEntry((current) => ({
      ...current,
      priorities: current.priorities.map((priority, priorityIndex) =>
        priorityIndex === index ? { ...priority, ...patch } : priority
      )
    }))
  }

  return (
    <div className="daily-log-view" hidden={hidden}>
      <header className="daily-log-header">
        <div>
          <p className="eyebrow">DAILY LOG</p>
          <h1>{formatDate(selectedDate, { weekday: 'long' })}.</h1>
          <p>{formatDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="daily-log-actions">
          <span className={`save-state ${status}`}>
            {status === 'saving' && <LoaderCircle size={12} />}
            {status === 'loading' ? 'Opening entry' : status === 'error' ? 'Save failed' : status}
          </span>
          <div className="date-controls">
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setSelectedDate(today)}>TODAY</button>
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              aria-label="Next day"
              disabled={selectedDate >= today}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <section className="daily-log-intention">
        <label htmlFor="daily-log-intention">
          <span>01 · MORNING INTENTION</span>
          <small>What deserves your attention today?</small>
        </label>
        <textarea
          id="daily-log-intention"
          value={entry.intention}
          onChange={(event) => setEntry({ ...entry, intention: event.target.value })}
          placeholder="Begin the day with direction…"
          maxLength={240}
        />
      </section>

      <section className="daily-log-plan">
        <div className="daily-log-priorities">
          <div className="daily-log-section-title">
            <div>
              <p className="eyebrow">02 · PRIORITIES</p>
              <h2>The essential three.</h2>
            </div>
            <span>{entry.priorities.filter((priority) => priority.completed).length} / 3 KEPT</span>
          </div>
          <div className="daily-log-priority-list">
            {entry.priorities.map((priority, index) => (
              <div key={priority.id} className={priority.completed ? 'complete' : ''}>
                <button
                  onClick={() => updatePriority(index, { completed: !priority.completed })}
                  aria-label={`Toggle priority ${index + 1}`}
                >
                  {priority.completed ? <Check size={13} /> : <Circle size={17} />}
                </button>
                <span>0{index + 1}</span>
                <input
                  value={priority.text}
                  onChange={(event) => updatePriority(index, { text: event.target.value })}
                  placeholder={`Priority ${index + 1}`}
                  maxLength={140}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="daily-log-pulse">
          <p className="eyebrow">03 · MORNING PULSE</p>
          <h2>Meet yourself honestly.</h2>
          <label>
            <span>Mood</span>
            <input
              type="range"
              min="1"
              max="10"
              value={entry.mood}
              onChange={(event) => setEntry({ ...entry, mood: Number(event.target.value) })}
            />
            <strong>{entry.mood}</strong>
          </label>
          <label>
            <span>Energy</span>
            <input
              type="range"
              min="1"
              max="10"
              value={entry.energy}
              onChange={(event) => setEntry({ ...entry, energy: Number(event.target.value) })}
            />
            <strong>{entry.energy}</strong>
          </label>
        </div>
      </section>

      <section className="daily-log-writing">
        <label>
          <span>04 · GRATITUDE</span>
          <h2>What was already good?</h2>
          <textarea
            value={entry.gratitude}
            onChange={(event) => setEntry({ ...entry, gratitude: event.target.value })}
            placeholder="Name the people, moments, or provisions you are grateful for…"
            maxLength={1000}
          />
        </label>
        <label>
          <span>05 · EVENING REFLECTION</span>
          <h2>What moved you forward?</h2>
          <textarea
            value={entry.reflection}
            onChange={(event) => setEntry({ ...entry, reflection: event.target.value })}
            placeholder="Record the win, the resistance, and the lesson…"
            maxLength={2000}
          />
        </label>
      </section>
    </div>
  )
}
