import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  Circle,
  Cross,
  Dumbbell,
  Feather,
  Home,
  LoaderCircle,
  Library,
  Settings,
  Sparkles,
  Target
} from 'lucide-react'
import { createEmptyEntry, type DailyEntry } from '../../shared/journal'

const today = new Date().toISOString().slice(0, 10)

const kaizenThoughts = [
  'Small steps, repeated with intention, become transformation.',
  'Improve the system, and the result will follow.',
  'Do not chase perfection. Refine what you practiced yesterday.',
  'A quiet commitment kept daily is stronger than sudden motivation.',
  'Notice honestly. Adjust deliberately. Continue patiently.',
  'The direction matters more than the speed.',
  'Become better by making the next action better.'
] as const

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

function formattedDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date())
}

function thoughtForToday(): string {
  const dayNumber = Math.floor(new Date(`${today}T00:00:00`).getTime() / 86_400_000)
  return kaizenThoughts[dayNumber % kaizenThoughts.length] ?? kaizenThoughts[0]
}

export function App(): React.JSX.Element {
  const [entry, setEntry] = useState<DailyEntry>(() => createEmptyEntry(today))
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [hydrated, setHydrated] = useState(false)
  const completed = entry.priorities.filter((priority) => priority.completed).length
  const commitmentsCompleted = Object.values(entry.commitments).filter(
    (commitment) => commitment.completed
  ).length
  const progress = useMemo(() => {
    const intention = entry.intention.trim() ? 15 : 0
    const priorities = Math.round((completed / 3) * 40)
    const commitments = Math.round((commitmentsCompleted / 3) * 30)
    const reflection = entry.reflection.trim() ? 15 : 0
    return intention + priorities + commitments + reflection
  }, [commitmentsCompleted, completed, entry.intention, entry.reflection])

  useEffect(() => {
    void window.kairo.journal
      .get(today)
      .then((value) => {
        setEntry(value)
        setStatus('saved')
        setHydrated(true)
      })
      .catch(() => setStatus('error'))
  }, [])

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

  const updateCommitment = <K extends keyof DailyEntry['commitments']>(
    key: K,
    patch: Partial<DailyEntry['commitments'][K]>
  ): void => {
    setEntry((current) => ({
      ...current,
      commitments: {
        ...current.commitments,
        [key]: { ...current.commitments[key], ...patch }
      }
    }))
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" title="Kai — change for the better" aria-hidden="true">
            <span className="brand-frame" />
            <span className="brand-glyph" lang="ja">
              改
            </span>
            <i />
          </span>
          <span className="brand-name">
            <strong>KAIRO</strong>
            <small>CONTINUOUS BECOMING</small>
          </span>
        </div>
        <nav>
          <button className="active">
            <Home size={17} />
            <span className="nav-label">Command Center</span>
          </button>
          <button>
            <Feather size={17} />
            <span className="nav-label">Daily Log</span>
          </button>
          <button>
            <Target size={17} />
            <span className="nav-label">Commitments</span>
          </button>
          <button>
            <BookOpen size={17} />
            <span className="nav-label">History</span>
          </button>
          <button>
            <Sparkles size={17} />
            <span className="nav-label">Weekly Review</span>
          </button>
        </nav>
        <button className="settings">
          <Settings size={17} />
          <span className="nav-label">Settings</span>
        </button>
      </aside>

      <section className="content">
        <header>
          <div className="header-line">
            <p className="eyebrow">{formattedDate().toUpperCase()}</p>
            <span className={`save-state ${status}`}>
              {status === 'saving' && <LoaderCircle size={12} />}
              {status === 'loading'
                ? 'Opening journal'
                : status === 'error'
                  ? 'Save failed'
                  : status}
            </span>
          </div>
          <h1>{greeting()}</h1>
          <p className="lede">“{thoughtForToday()}”</p>
        </header>

        <div className="rule" />
        <section className="mission">
          <label className="eyebrow" htmlFor="intention">
            TODAY'S INTENTION
          </label>
          <input
            id="intention"
            value={entry.intention}
            onChange={(event) => setEntry({ ...entry, intention: event.target.value })}
            placeholder="What matters most today?"
            maxLength={240}
          />
        </section>

        <div className="grid">
          <section>
            <div className="section-title">
              <p className="eyebrow">PRIORITIES</p>
              <span>{completed} / 3</span>
            </div>
            <div className="checklist">
              {entry.priorities.map((priority, index) => (
                <div className="check" key={priority.id}>
                  <button
                    className={priority.completed ? 'done' : 'circle-button'}
                    aria-label={`Mark priority ${index + 1} ${priority.completed ? 'incomplete' : 'complete'}`}
                    onClick={() => updatePriority(index, { completed: !priority.completed })}
                  >
                    {priority.completed ? <Check size={13} /> : <Circle size={17} />}
                  </button>
                  <input
                    value={priority.text}
                    onChange={(event) => updatePriority(index, { text: event.target.value })}
                    placeholder={`Priority ${index + 1}`}
                    maxLength={140}
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="pulse">
            <p className="eyebrow">TODAY'S PULSE</p>
            <div className="score">
              <strong>{progress}</strong>
              <span>/ 100</span>
            </div>
            <div className="progress">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="meters">
              <label>
                Mood{' '}
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={entry.mood}
                  onChange={(e) => setEntry({ ...entry, mood: Number(e.target.value) })}
                />
                <span>{entry.mood}</span>
              </label>
              <label>
                Energy{' '}
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={entry.energy}
                  onChange={(e) => setEntry({ ...entry, energy: Number(e.target.value) })}
                />
                <span>{entry.energy}</span>
              </label>
            </div>
          </section>
        </div>

        <section className="commitments-section">
          <div className="section-title commitments-heading">
            <div>
              <p className="eyebrow">DAILY COMMITMENTS</p>
              <h2>Keep faith with yourself.</h2>
            </div>
            <span>{commitmentsCompleted} / 3 KEPT</span>
          </div>
          <div className="commitment-grid">
            <article
              className={entry.commitments.workout.completed ? 'commitment complete' : 'commitment'}
            >
              <div className="commitment-topline">
                <Dumbbell size={18} />
                <button
                  aria-label="Toggle workout completion"
                  onClick={() =>
                    updateCommitment('workout', {
                      completed: !entry.commitments.workout.completed,
                      scheduled: true
                    })
                  }
                >
                  {entry.commitments.workout.completed ? <Check size={13} /> : <Circle size={17} />}
                </button>
              </div>
              <div>
                <p className="eyebrow">HEALTH</p>
                <h3>Workout</h3>
              </div>
              <input
                value={entry.commitments.workout.plan}
                onChange={(event) =>
                  updateCommitment('workout', { plan: event.target.value, scheduled: true })
                }
                placeholder="What is the plan?"
                maxLength={160}
              />
            </article>

            <article
              className={entry.commitments.reading.completed ? 'commitment complete' : 'commitment'}
            >
              <div className="commitment-topline">
                <Library size={18} />
                <button
                  aria-label="Toggle reading completion"
                  onClick={() =>
                    updateCommitment('reading', { completed: !entry.commitments.reading.completed })
                  }
                >
                  {entry.commitments.reading.completed ? <Check size={13} /> : <Circle size={17} />}
                </button>
              </div>
              <div>
                <p className="eyebrow">LEARNING</p>
                <h3>Reading</h3>
              </div>
              <div className="commitment-fields">
                <input
                  value={entry.commitments.reading.book}
                  onChange={(event) => updateCommitment('reading', { book: event.target.value })}
                  placeholder="Current book"
                  maxLength={160}
                />
                <input
                  value={entry.commitments.reading.target}
                  onChange={(event) => updateCommitment('reading', { target: event.target.value })}
                  placeholder="Pages or time"
                  maxLength={80}
                />
              </div>
            </article>

            <article
              className={entry.commitments.faith.completed ? 'commitment complete' : 'commitment'}
            >
              <div className="commitment-topline">
                <Cross size={18} />
                <button
                  aria-label="Toggle faith reading completion"
                  onClick={() =>
                    updateCommitment('faith', { completed: !entry.commitments.faith.completed })
                  }
                >
                  {entry.commitments.faith.completed ? <Check size={13} /> : <Circle size={17} />}
                </button>
              </div>
              <div>
                <p className="eyebrow">FAITH</p>
                <h3>Scripture</h3>
              </div>
              <input
                value={entry.commitments.faith.reference}
                onChange={(event) => updateCommitment('faith', { reference: event.target.value })}
                placeholder="Today’s reference"
                maxLength={120}
              />
            </article>
          </div>
        </section>

        <section className="reflection">
          <div>
            <p className="eyebrow">EVENING REFLECTION</p>
            <h3>What moved you forward today?</h3>
          </div>
          <textarea
            value={entry.reflection}
            onChange={(e) => setEntry({ ...entry, reflection: e.target.value })}
            placeholder="Write a few honest lines…"
            maxLength={2000}
          />
        </section>
      </section>
    </main>
  )
}
