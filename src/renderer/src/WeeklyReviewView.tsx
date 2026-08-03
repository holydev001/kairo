import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Circle, LoaderCircle } from 'lucide-react'
import type { DailyEntry } from '../../shared/journal'
import { createEmptyWeeklyReview, type WeeklyReview } from '../../shared/weekly-review'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mondayFor(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = monday.getDay()
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
  return monday
}

function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

export function WeeklyReviewView({ hidden }: { hidden: boolean }): React.JSX.Element {
  const currentWeek = toDateKey(mondayFor(new Date()))
  const [weekStart, setWeekStart] = useState(currentWeek)
  const [review, setReview] = useState<WeeklyReview>(() => createEmptyWeeklyReview(currentWeek))
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [hydrated, setHydrated] = useState(false)

  const weekDates = useMemo(() => {
    const monday = dateFromKey(weekStart)
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
  }, [weekStart])
  const weekEnd = weekDates[6] ?? dateFromKey(weekStart)
  const weekEntries = useMemo(() => {
    const endKey = toDateKey(weekEnd)
    return entries.filter((entry) => entry.date >= weekStart && entry.date <= endKey)
  }, [entries, weekEnd, weekStart])

  const metrics = useMemo(() => {
    const priorities = weekEntries.flatMap((entry) => entry.priorities)
    const commitments = weekEntries.flatMap((entry) =>
      entry.commitmentCategories.flatMap((category) => category.commitments)
    )
    const average = (values: number[]): number =>
      values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
        : 0
    return {
      days: weekEntries.length,
      priorities: priorities.filter((priority) => priority.completed).length,
      prioritiesTotal: priorities.length,
      commitments: commitments.filter((commitment) => commitment.completed).length,
      commitmentsTotal: commitments.length,
      mood: average(weekEntries.map((entry) => entry.mood)),
      energy: average(weekEntries.map((entry) => entry.energy))
    }
  }, [weekEntries])

  useEffect(() => {
    if (hidden) return
    void window.kairo.journal
      .list()
      .then(setEntries)
      .catch(() => setStatus('error'))
  }, [hidden])

  useEffect(() => {
    if (hidden) return
    setHydrated(false)
    setStatus('loading')
    void window.kairo.weeklyReview
      .get(weekStart)
      .then((value) => {
        setReview(value)
        setHydrated(true)
        setStatus('saved')
      })
      .catch(() => setStatus('error'))
  }, [hidden, weekStart])

  useEffect(() => {
    if (!hydrated) return
    setStatus('saving')
    const timeout = window.setTimeout(() => {
      void window.kairo.weeklyReview
        .save(review)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [hydrated, review])

  const changeWeek = (amount: number): void => {
    setWeekStart(toDateKey(addDays(dateFromKey(weekStart), amount * 7)))
  }

  const updateReview = (
    field: 'wins' | 'challenges' | 'lessons' | 'nextFocus',
    value: string
  ): void => {
    setReview((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="weekly-review-view" hidden={hidden}>
      <header className="weekly-review-header">
        <div>
          <p className="eyebrow">WEEKLY REVIEW</p>
          <h1>Correct the course.</h1>
          <p>
            {formatDate(dateFromKey(weekStart), { month: 'long', day: 'numeric' })} —{' '}
            {formatDate(weekEnd, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="week-controls">
          <button onClick={() => changeWeek(-1)} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart(currentWeek)}>THIS WEEK</button>
          <button
            onClick={() => changeWeek(1)}
            aria-label="Next week"
            disabled={weekStart >= currentWeek}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <section className="weekly-metrics" aria-label="Weekly progress summary">
        <div>
          <span>DAYS RECORDED</span>
          <strong>
            {metrics.days}
            <small>/ 7</small>
          </strong>
        </div>
        <div>
          <span>PRIORITIES KEPT</span>
          <strong>
            {metrics.priorities}
            <small>/ {metrics.prioritiesTotal || 0}</small>
          </strong>
        </div>
        <div>
          <span>COMMITMENTS KEPT</span>
          <strong>
            {metrics.commitments}
            <small>/ {metrics.commitmentsTotal || 0}</small>
          </strong>
        </div>
        <div>
          <span>AVERAGE PULSE</span>
          <strong>
            {metrics.mood || '—'}
            <small> mood</small>
          </strong>
          <em>{metrics.energy || '—'} energy</em>
        </div>
      </section>

      <section className="weekly-ledger">
        <div className="weekly-section-heading">
          <div>
            <p className="eyebrow">SEVEN DAY RECORD</p>
            <h2>What the week reveals.</h2>
          </div>
          <span>{metrics.days} DAYS PRESENT</span>
        </div>
        <div className="week-days">
          {weekDates.map((date) => {
            const key = toDateKey(date)
            const entry = weekEntries.find((item) => item.date === key)
            const prioritiesDone =
              entry?.priorities.filter((priority) => priority.completed).length ?? 0
            return (
              <article className={entry ? 'recorded' : ''} key={key}>
                <span>{formatDate(date, { weekday: 'short' }).toUpperCase()}</span>
                <strong>{formatDate(date, { day: '2-digit' })}</strong>
                <div>{entry ? <Check size={12} /> : <Circle size={13} />}</div>
                <small>{entry ? `${prioritiesDone}/3 priorities` : 'No entry'}</small>
              </article>
            )
          })}
        </div>
      </section>

      <section className="weekly-reflection">
        <div className="weekly-section-heading">
          <div>
            <p className="eyebrow">COURSE CORRECTION</p>
            <h2>Examine honestly. Adjust deliberately.</h2>
          </div>
          <span className={`save-state ${status}`}>
            {status === 'saving' && <LoaderCircle size={12} />}
            {status === 'loading' ? 'Opening review' : status === 'error' ? 'Save failed' : status}
          </span>
        </div>
        <div className="weekly-prompts">
          <label>
            <span>01 · BIGGEST WINS</span>
            <textarea
              value={review.wins}
              onChange={(event) => updateReview('wins', event.target.value)}
              placeholder="What moved forward this week?"
              maxLength={2000}
            />
          </label>
          <label>
            <span>02 · CHALLENGES</span>
            <textarea
              value={review.challenges}
              onChange={(event) => updateReview('challenges', event.target.value)}
              placeholder="Where did resistance appear?"
              maxLength={2000}
            />
          </label>
          <label>
            <span>03 · LESSONS</span>
            <textarea
              value={review.lessons}
              onChange={(event) => updateReview('lessons', event.target.value)}
              placeholder="What did the week teach you?"
              maxLength={2000}
            />
          </label>
          <label>
            <span>04 · NEXT WEEK'S FOCUS</span>
            <textarea
              value={review.nextFocus}
              onChange={(event) => updateReview('nextFocus', event.target.value)}
              placeholder="What deserves your attention next?"
              maxLength={2000}
            />
          </label>
        </div>
      </section>
    </div>
  )
}
