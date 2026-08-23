import { useEffect, useMemo, useState } from 'react'
import { Check, Circle, Plus, Target, Trash2, X } from 'lucide-react'
import { createDefaultHabitStore, type Habit, type HabitStore } from '../../shared/habits'
import { commitmentIconNames } from './commitment-icon-library'
import { CommitmentIcon } from './commitment-icons'

const today = new Date().toISOString().slice(0, 10)

function dateOffset(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function formatDay(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
}

type HabitViewProps = { hidden: boolean }

export function HabitView({ hidden }: HabitViewProps): React.JSX.Element {
  const [store, setStore] = useState<HabitStore>(createDefaultHabitStore)
  const [hydrated, setHydrated] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    identity: '',
    cue: '',
    tinyVersion: '',
    reward: '',
    icon: 'target'
  })
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => dateOffset(index - 6)), [])
  const completedToday = store.habits.filter((habit) => store.completions[habit.id]?.[today]).length

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

  const toggleHabit = (habit: Habit, date = today): void => {
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
      identity: draft.identity.trim(),
      cue: draft.cue.trim(),
      tinyVersion: draft.tinyVersion.trim(),
      reward: draft.reward.trim(),
      icon: draft.icon,
      createdAt: new Date().toISOString()
    }
    setStore((current) => ({ ...current, habits: [...current.habits, habit] }))
    setDraft({ title: '', identity: '', cue: '', tinyVersion: '', reward: '', icon: 'target' })
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
          <h1>Become the kind of person who does it.</h1>
          <p>Design small actions around the identity you want to reinforce.</p>
        </div>
        <div className="habits-header-progress">
          <strong>{completedToday}</strong>
          <span>/ {store.habits.length} today</span>
        </div>
      </header>

      <div className="habits-toolbar">
        <div>
          <p className="eyebrow">DAILY PRACTICE</p>
          <span>Make it obvious. Make it easy. Return tomorrow.</span>
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
              <h2>Give the action a reason to exist.</h2>
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
          <div className="habit-form-fields">
            <label>
              <span>HABIT</span>
              <input
                autoFocus
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Read ten pages"
                maxLength={80}
              />
            </label>
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
              <span>TINY VERSION · WHAT IS THE SMALLEST START?</span>
              <input
                value={draft.tinyVersion}
                onChange={(event) => setDraft({ ...draft, tinyVersion: event.target.value })}
                placeholder="Open the book and read one page"
                maxLength={160}
              />
            </label>
            <label>
              <span>REWARD · WHAT MAKES IT SATISFYING?</span>
              <input
                value={draft.reward}
                onChange={(event) => setDraft({ ...draft, reward: event.target.value })}
                placeholder="Mark it complete and feel the progress"
                maxLength={160}
              />
            </label>
          </div>
          <div className="habit-icon-picker">
            <p>CHOOSE AN ICON</p>
            <div>
              {commitmentIconNames.map((name) => (
                <button
                  className={draft.icon === name ? 'selected' : ''}
                  type="button"
                  key={name}
                  onClick={() => setDraft({ ...draft, icon: name })}
                  aria-label={`Use ${name} icon`}
                >
                  <CommitmentIcon name={name} size={17} />
                </button>
              ))}
            </div>
          </div>
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
          <p>A habit is a vote for the person you are becoming. Keep the first one easy.</p>
        </section>
      ) : (
        <div className="habit-list">
          {store.habits.map((habit) => {
            const completed = Boolean(store.completions[habit.id]?.[today])
            return (
              <article className={completed ? 'habit-card complete' : 'habit-card'} key={habit.id}>
                <div className="habit-card-topline">
                  <CommitmentIcon name={habit.icon} />
                  <div className="habit-card-actions">
                    <button
                      type="button"
                      onClick={() => deleteHabit(habit.id)}
                      aria-label={`Delete ${habit.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHabit(habit)}
                      aria-label={`Complete ${habit.title} today`}
                    >
                      {completed ? <Check size={13} /> : <Circle size={17} />}
                    </button>
                  </div>
                </div>
                <p className="eyebrow">IDENTITY</p>
                <h2>{habit.title}</h2>
                {habit.identity && <p className="habit-identity">{habit.identity}</p>}
                <div className="habit-context">
                  {habit.cue && (
                    <span>
                      <b>CUE</b>
                      {habit.cue}
                    </span>
                  )}
                  {habit.tinyVersion && (
                    <span>
                      <b>TINY VERSION</b>
                      {habit.tinyVersion}
                    </span>
                  )}
                  {habit.reward && (
                    <span>
                      <b>REWARD</b>
                      {habit.reward}
                    </span>
                  )}
                </div>
                <div className="habit-week" aria-label="Last seven days">
                  {days.map((date) => {
                    const done = Boolean(store.completions[habit.id]?.[date])
                    return (
                      <button
                        className={done ? 'done' : ''}
                        type="button"
                        key={date}
                        onClick={() => toggleHabit(habit, date)}
                        aria-label={`${formatDay(date)} ${done ? 'completed' : 'not completed'}`}
                      >
                        <span>{formatDay(date)}</span>
                        <i />
                      </button>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
