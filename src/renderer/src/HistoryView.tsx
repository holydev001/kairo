import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronRight, Circle, LoaderCircle } from 'lucide-react'
import type { DailyEntry } from '../../shared/journal'
import { CommitmentIcon } from './commitment-icons'

function entryDate(date: string, format: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', format).format(new Date(`${date}T00:00:00`))
}

function completedCount(entry: DailyEntry): number {
  return entry.priorities.filter((priority) => priority.completed).length
}

function commitmentCount(entry: DailyEntry): { completed: number; total: number } {
  const commitments = entry.commitmentCategories.flatMap((category) => category.commitments)
  return {
    completed: commitments.filter((commitment) => commitment.completed).length,
    total: commitments.length
  }
}

export function HistoryView({ hidden }: { hidden: boolean }): React.JSX.Element {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (hidden) return
    setStatus('loading')
    void window.kairo.journal
      .list()
      .then((value) => {
        setEntries(value)
        setSelectedDate((current) =>
          value.some((entry) => entry.date === current) ? current : (value[0]?.date ?? '')
        )
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [hidden])

  const selected = useMemo(
    () => entries.find((entry) => entry.date === selectedDate),
    [entries, selectedDate]
  )

  return (
    <div className="history-view" hidden={hidden}>
      <header className="history-header">
        <div>
          <p className="eyebrow">JOURNAL HISTORY</p>
          <h1>A record of becoming.</h1>
          <p>Return to the days that shaped your direction.</p>
        </div>
        <span className="history-count">{entries.length} ENTRIES</span>
      </header>

      {status === 'loading' ? (
        <div className="history-state">
          <LoaderCircle size={18} /> Opening your record
        </div>
      ) : status === 'error' ? (
        <div className="history-state error">History could not be opened.</div>
      ) : entries.length === 0 ? (
        <div className="history-empty">
          <CalendarDays size={22} />
          <h2>Your record begins today.</h2>
          <p>Completed daily entries will appear here in reverse chronological order.</p>
        </div>
      ) : (
        <div className="history-layout">
          <aside className="history-list" aria-label="Journal entries">
            {entries.map((entry) => {
              const commitmentProgress = commitmentCount(entry)
              return (
                <button
                  className={entry.date === selectedDate ? 'selected' : ''}
                  key={entry.date}
                  onClick={() => setSelectedDate(entry.date)}
                >
                  <span className="history-date-block">
                    <strong>{entryDate(entry.date, { day: '2-digit' })}</strong>
                    <span>
                      {entryDate(entry.date, { month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                  </span>
                  <span className="history-list-copy">
                    <strong>{entry.intention || 'An unwritten intention'}</strong>
                    <small>
                      {completedCount(entry)}/3 priorities · {commitmentProgress.completed}/
                      {commitmentProgress.total} commitments
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              )
            })}
          </aside>

          {selected && (
            <article className="history-detail">
              <div className="history-detail-heading">
                <div>
                  <p className="eyebrow">
                    {entryDate(selected.date, { weekday: 'long' }).toUpperCase()}
                  </p>
                  <h2>
                    {entryDate(selected.date, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                </div>
                <div className="history-meters">
                  <span>
                    Mood <strong>{selected.mood}</strong>
                  </span>
                  <span>
                    Energy <strong>{selected.energy}</strong>
                  </span>
                </div>
              </div>

              <section className="history-intention">
                <p className="eyebrow">INTENTION</p>
                <blockquote>{selected.intention || 'No intention recorded.'}</blockquote>
              </section>

              <section className="history-section">
                <p className="eyebrow">PRIORITIES</p>
                <div className="history-priorities">
                  {selected.priorities.map((priority) => (
                    <div key={priority.id} className={priority.completed ? 'complete' : ''}>
                      {priority.completed ? <Check size={13} /> : <Circle size={15} />}
                      <span>{priority.text || 'No priority recorded'}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="history-section">
                <p className="eyebrow">COMMITMENTS</p>
                <div className="history-commitments">
                  {selected.commitmentCategories.flatMap((category) =>
                    category.commitments.map((commitment) => (
                      <div key={commitment.id} className={commitment.completed ? 'complete' : ''}>
                        <CommitmentIcon name={commitment.icon} size={15} />
                        <span>
                          <strong>{commitment.title}</strong>
                          <small>{category.name}</small>
                        </span>
                        {commitment.completed && <Check size={13} />}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="history-reflection">
                <p className="eyebrow">EVENING REFLECTION</p>
                <p>{selected.reflection || 'No reflection recorded.'}</p>
              </section>
            </article>
          )}
        </div>
      )}
    </div>
  )
}
