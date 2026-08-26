import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Target, Trash2, X } from 'lucide-react'
import { createDefaultHabitStore, type Habit, type HabitStore } from '../../shared/habits'
import { commitmentIconNames } from './commitment-icon-library'
import { CommitmentIcon } from './commitment-icons'

const today = new Date()
const todayKey = toDateKey(today)

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function moveDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfWeek(date: Date): Date {
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  return start
}

function weekLabel(start: Date): string {
  const end = moveDays(start, 6)
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  return `${format.format(start)} – ${format.format(end)}`
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
}

type HabitViewProps = { hidden: boolean }

export function HabitView({ hidden }: HabitViewProps): React.JSX.Element {
  const [store, setStore] = useState<HabitStore>(createDefaultHabitStore)
  const [hydrated, setHydrated] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [draft, setDraft] = useState({
    title: '',
    icon: 'target',
    identity: '',
    cue: '',
    tinyVersion: '',
    reward: ''
  })
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => moveDays(weekStart, index)),
    [weekStart]
  )
  const totalPossible = store.habits.length * days.length
  const totalCompleted = store.habits.reduce(
    (total, habit) =>
      total + days.filter((day) => store.completions[habit.id]?.[toDateKey(day)]).length,
    0
  )
  const overall = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0

  useEffect(() => {
    void window.kairo.habits
      .get()
      .then((value) => {
        setStore(value)
        setHydrated(true)
      })
      .catch(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timeout = window.setTimeout(() => void window.kairo.habits.save(store), 350)
    return () => window.clearTimeout(timeout)
  }, [hydrated, store])

  const changeWeek = (offset: number): void => {
    setWeekStart((current) => moveDays(current, offset * 7))
  }

  const toggleHabit = (habit: Habit, date: string): void => {
    setStore((current) => ({
      ...current,
      completions: {
        ...current.completions,
        [habit.id]: {
          ...current.completions[habit.id],
          [date]: !current.completions[habit.id]?.[date]
        }
      }
    }))
  }

  const addHabit = (): void => {
    if (!draft.title.trim()) return
    const habit: Habit = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      icon: draft.icon,
      identity: draft.identity.trim(),
      cue: draft.cue.trim(),
      tinyVersion: draft.tinyVersion.trim(),
      reward: draft.reward.trim(),
      createdAt: new Date().toISOString()
    }
    setStore((current) => ({ ...current, habits: [...current.habits, habit] }))
    setDraft({ title: '', icon: 'target', identity: '', cue: '', tinyVersion: '', reward: '' })
    setShowForm(false)
  }

  const deleteHabit = (id: string): void => {
    setStore((current) => {
      const completions = { ...current.completions }
      delete completions[id]
      return { habits: current.habits.filter((habit) => habit.id !== id), completions }
    })
  }

  return (
    <div className="habits-view" hidden={hidden}>
      <header className="habits-header">
        <div>
          <p className="eyebrow">THE PRACTICE</p>
          <h1>Small actions, seen clearly.</h1>
          <p>A quiet record of the days you showed up.</p>
        </div>
        <div className="habits-header-progress">
          <strong>{overall}%</strong>
          <span>this week</span>
        </div>
      </header>

      <div className="habits-toolbar">
        <div className="habits-week-control">
          <button type="button" onClick={() => changeWeek(-1)} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="eyebrow">WEEK OF</p>
            <strong>{weekLabel(weekStart)}</strong>
          </div>
          <button type="button" onClick={() => changeWeek(1)} aria-label="Next week">
            <ChevronRight size={16} />
          </button>
        </div>
        <button className="primary-action" type="button" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New habit
        </button>
      </div>

      {showForm && (
        <section className="habit-form">
          <div className="form-heading">
            <div>
              <p className="eyebrow">NEW HABIT</p>
              <h2>What do you want to practice?</h2>
            </div>
            <button
              className="icon-action"
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
          <div className="habit-form-simple">
            <label>
              <span>HABIT</span>
              <input
                autoFocus
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Read 20 pages"
                maxLength={80}
              />
            </label>
            <div className="habit-icon-picker">
              <p>ICON</p>
              <div>
                {commitmentIconNames.map((name) => (
                  <button
                    className={draft.icon === name ? 'selected' : ''}
                    type="button"
                    key={name}
                    onClick={() => setDraft({ ...draft, icon: name })}
                    aria-label={`Use ${name} icon`}
                  >
                    <CommitmentIcon name={name} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <details className="habit-details">
            <summary>Optional context</summary>
            <div className="habit-form-fields">
              <label>
                <span>IDENTITY · WHO ARE YOU BECOMING?</span>
                <input
                  value={draft.identity}
                  onChange={(event) => setDraft({ ...draft, identity: event.target.value })}
                  placeholder="A person who keeps learning"
                  maxLength={120}
                />
              </label>
              <label>
                <span>CUE · WHEN WILL IT HAPPEN?</span>
                <input
                  value={draft.cue}
                  onChange={(event) => setDraft({ ...draft, cue: event.target.value })}
                  placeholder="After my morning coffee"
                  maxLength={160}
                />
              </label>
              <label>
                <span>TINY VERSION · SMALLEST START</span>
                <input
                  value={draft.tinyVersion}
                  onChange={(event) => setDraft({ ...draft, tinyVersion: event.target.value })}
                  placeholder="Read one page"
                  maxLength={160}
                />
              </label>
              <label>
                <span>REWARD</span>
                <input
                  value={draft.reward}
                  onChange={(event) => setDraft({ ...draft, reward: event.target.value })}
                  placeholder="Mark the day and move on"
                  maxLength={160}
                />
              </label>
            </div>
          </details>
          <button
            className="form-confirm"
            type="button"
            disabled={!draft.title.trim()}
            onClick={addHabit}
          >
            Add habit
          </button>
        </section>
      )}

      {store.habits.length === 0 ? (
        <section className="habits-empty">
          <Target size={20} />
          <h2>Start with one small practice.</h2>
          <p>
            Add only the habits that genuinely matter this week. You can always add another later.
          </p>
        </section>
      ) : (
        <section className="habit-ledger-wrap" aria-label={`${weekLabel(weekStart)} habit tracker`}>
          <div className="habit-ledger-scroll">
            <div className="habit-ledger habit-ledger-weekly">
              <div className="habit-ledger-corner">HABITS</div>
              {days.map((day) => (
                <div className="habit-day-heading" key={toDateKey(day)}>
                  <span>{dayLabel(day)}</span>
                  <b>{day.getDate()}</b>
                </div>
              ))}
              {store.habits.map((habit) => (
                <div className="habit-ledger-row" key={habit.id}>
                  <div className="habit-name-cell">
                    <CommitmentIcon name={habit.icon} size={15} />
                    <span title={habit.identity || undefined}>{habit.title}</span>
                    <button
                      type="button"
                      onClick={() => deleteHabit(habit.id)}
                      aria-label={`Delete ${habit.title}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {days.map((day) => {
                    const date = toDateKey(day)
                    const done = Boolean(store.completions[habit.id]?.[date])
                    return (
                      <button
                        className={`habit-day-cell${done ? ' done' : ''}${date === todayKey ? ' today' : ''}`}
                        type="button"
                        key={date}
                        onClick={() => toggleHabit(habit, date)}
                        aria-label={`${habit.title}, ${date}, ${done ? 'complete' : 'incomplete'}`}
                      >
                        <i />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="habit-ledger-footer">
            <span>Show up when you can. Missed days are information, not failure.</span>
            <span>
              <b>{totalCompleted}</b> of {totalPossible} days completed
            </span>
          </div>
        </section>
      )}
    </div>
  )
}
