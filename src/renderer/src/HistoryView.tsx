import { useEffect, useState } from 'react'
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
  const [expandedDates, setExpandedDates] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (hidden) return
    setStatus('loading')
    void window.kairo.journal
      .list()
      .then((value) => {
        setEntries(value)
        setExpandedDates((current) => {
          const existing = current.filter((date) => value.some((entry) => entry.date === date))
          return existing.length ? existing : value[0] ? [value[0].date] : []
        })
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [hidden])

  const toggleDate = (date: string): void => {
    setExpandedDates((current) =>
      current.includes(date) ? current.filter((item) => item !== date) : [...current, date]
    )
  }

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
        <div className="history-days">
          {entries.map((entry) => {
            const isExpanded = expandedDates.includes(entry.date)
            const commitmentProgress = commitmentCount(entry)

            return (
              <section
                className={isExpanded ? 'history-day expanded' : 'history-day'}
                key={entry.date}
              >
                <button
                  className="history-day-trigger"
                  onClick={() => toggleDate(entry.date)}
                  aria-expanded={isExpanded}
                  aria-controls={`history-${entry.date}`}
                >
                  <span className="history-date-block">
                    <strong>{entryDate(entry.date, { day: '2-digit' })}</strong>
                    <span>
                      {entryDate(entry.date, { month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                  </span>
                  <span className="history-list-copy">
                    <small>{entryDate(entry.date, { weekday: 'long' }).toUpperCase()}</small>
                    <strong>{entry.intention || 'An unwritten intention'}</strong>
                  </span>
                  <span className="history-day-summary">
                    <span>{completedCount(entry)}/3 PRIORITIES</span>
                    <span>
                      {commitmentProgress.completed}/{commitmentProgress.total} KEPT
                    </span>
                  </span>
                  <ChevronRight size={17} />
                </button>

                {isExpanded && (
                  <article className="history-detail" id={`history-${entry.date}`}>
                    <div className="history-detail-heading">
                      <div>
                        <p className="eyebrow">DAILY RECORD</p>
                        <h2>
                          {entryDate(entry.date, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </h2>
                      </div>
                      <div className="history-meters">
                        <span>
                          Mood <strong>{entry.mood}</strong>
                        </span>
                        <span>
                          Energy <strong>{entry.energy}</strong>
                        </span>
                      </div>
                    </div>

                    <section className="history-intention">
                      <p className="eyebrow">INTENTION</p>
                      <blockquote>{entry.intention || 'No intention recorded.'}</blockquote>
                    </section>

                    <div className="history-record-grid">
                      <section className="history-section">
                        <p className="eyebrow">PRIORITIES</p>
                        <div className="history-priorities">
                          {entry.priorities.map((priority) => (
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
                          {entry.commitmentCategories.flatMap((category) =>
                            category.commitments.map((commitment) => (
                              <div
                                key={commitment.id}
                                className={commitment.completed ? 'complete' : ''}
                              >
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
                    </div>

                    <section className="history-reflection">
                      <p className="eyebrow">EVENING REFLECTION</p>
                      <p>{entry.reflection || 'No reflection recorded.'}</p>
                    </section>
                  </article>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
