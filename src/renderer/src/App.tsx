import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Feather,
  Home,
  LoaderCircle,
  Plus,
  Settings,
  Sparkles,
  Target,
  Trash2,
  X
} from 'lucide-react'
import { createEmptyEntry, type DailyEntry } from '../../shared/journal'
import { commitmentIconNames } from './commitment-icon-library'
import { CommitmentIcon } from './commitment-icons'

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
  const [showCommitmentForm, setShowCommitmentForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [draft, setDraft] = useState({
    title: '',
    detail: '',
    target: '',
    icon: 'lightning',
    categoryId: 'health'
  })

  const completed = entry.priorities.filter((priority) => priority.completed).length
  const commitments = entry.commitmentCategories.flatMap((category) => category.commitments)
  const commitmentsCompleted = commitments.filter((commitment) => commitment.completed).length
  const progress = useMemo(() => {
    const intention = entry.intention.trim() ? 15 : 0
    const priorities = Math.round((completed / 3) * 40)
    const commitmentProgress = commitments.length
      ? Math.round((commitmentsCompleted / commitments.length) * 30)
      : 0
    const reflection = entry.reflection.trim() ? 15 : 0
    return intention + priorities + commitmentProgress + reflection
  }, [commitments.length, commitmentsCompleted, completed, entry.intention, entry.reflection])

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

  const updateCommitment = (
    categoryId: string,
    commitmentId: string,
    patch: Partial<DailyEntry['commitmentCategories'][number]['commitments'][number]>
  ): void => {
    setEntry((current) => ({
      ...current,
      commitmentCategories: current.commitmentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              commitments: category.commitments.map((commitment) =>
                commitment.id === commitmentId ? { ...commitment, ...patch } : commitment
              )
            }
          : category
      )
    }))
  }

  const deleteCommitment = (categoryId: string, commitmentId: string): void => {
    setEntry((current) => ({
      ...current,
      commitmentCategories: current.commitmentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              commitments: category.commitments.filter((item) => item.id !== commitmentId)
            }
          : category
      )
    }))
  }

  const addCategory = (): void => {
    const name = categoryName.trim()
    if (!name) return
    const id = crypto.randomUUID()
    setEntry((current) => ({
      ...current,
      commitmentCategories: [...current.commitmentCategories, { id, name, commitments: [] }]
    }))
    setDraft((current) => ({ ...current, categoryId: id }))
    setCategoryName('')
    setShowCategoryForm(false)
  }

  const addCommitment = (): void => {
    const title = draft.title.trim()
    if (!title || !draft.categoryId) return
    setEntry((current) => ({
      ...current,
      commitmentCategories: current.commitmentCategories.map((category) =>
        category.id === draft.categoryId
          ? {
              ...category,
              commitments: [
                ...category.commitments,
                {
                  id: crypto.randomUUID(),
                  title,
                  detail: draft.detail.trim(),
                  target: draft.target.trim(),
                  icon: draft.icon,
                  completed: false
                }
              ]
            }
          : category
      )
    }))
    setDraft((current) => ({ ...current, title: '', detail: '', target: '', icon: 'lightning' }))
    setShowCommitmentForm(false)
  }

  const openCommitmentForm = (categoryId?: string): void => {
    const fallback = entry.commitmentCategories[0]?.id ?? ''
    setDraft((current) => ({
      ...current,
      categoryId: categoryId ?? current.categoryId ?? fallback
    }))
    setShowCommitmentForm(true)
  }

  const selectedCategoryName =
    entry.commitmentCategories.find((category) => category.id === draft.categoryId)?.name ??
    'Choose category'

  return (
    <main className="shell">
      <div className="window-titlebar">
        <div className="window-titlebar-brand" aria-hidden="true">
          <span>改</span>
          <strong>KAIRO</strong>
        </div>
        <div className="window-drag-surface" aria-hidden="true" />
      </div>
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
                    aria-label={`Toggle priority ${index + 1}`}
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
                  onChange={(event) => setEntry({ ...entry, mood: Number(event.target.value) })}
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
                  onChange={(event) => setEntry({ ...entry, energy: Number(event.target.value) })}
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
            <div className="commitment-actions">
              <span>
                {commitmentsCompleted} / {commitments.length} KEPT
              </span>
              <button onClick={() => setShowCategoryForm(true)}>
                <Plus size={13} /> Category
              </button>
              <button className="primary-action" onClick={() => openCommitmentForm()}>
                <Plus size={13} /> Commitment
              </button>
            </div>
          </div>

          {showCategoryForm && (
            <div className="inline-form category-form">
              <label>
                <span>NEW CATEGORY</span>
                <input
                  autoFocus
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && addCategory()}
                  placeholder="e.g. Creative"
                  maxLength={50}
                />
              </label>
              <button className="form-confirm" onClick={addCategory}>
                Add category
              </button>
              <button
                className="icon-action"
                onClick={() => setShowCategoryForm(false)}
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {showCommitmentForm && (
            <div className="commitment-form">
              <div className="form-heading">
                <div>
                  <p className="eyebrow">NEW COMMITMENT</p>
                  <h3>Define the action.</h3>
                </div>
                <button
                  className="icon-action"
                  onClick={() => setShowCommitmentForm(false)}
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="form-fields">
                <label>
                  <span>NAME</span>
                  <input
                    autoFocus
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="Morning walk"
                    maxLength={80}
                  />
                </label>
                <div className="select-field">
                  <span>CATEGORY</span>
                  <div className="select-control">
                    <button
                      className={showCategoryMenu ? 'select-trigger open' : 'select-trigger'}
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={showCategoryMenu}
                      onClick={() => setShowCategoryMenu((current) => !current)}
                    >
                      <span>{selectedCategoryName}</span>
                      <ChevronDown size={15} aria-hidden="true" />
                    </button>
                    {showCategoryMenu && (
                      <div className="select-menu" role="listbox" aria-label="Commitment category">
                        {entry.commitmentCategories.map((category) => (
                          <button
                            className={draft.categoryId === category.id ? 'selected' : ''}
                            type="button"
                            role="option"
                            aria-selected={draft.categoryId === category.id}
                            key={category.id}
                            onClick={() => {
                              setDraft({ ...draft, categoryId: category.id })
                              setShowCategoryMenu(false)
                            }}
                          >
                            <span>{category.name}</span>
                            {draft.categoryId === category.id && <Check size={13} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <label>
                  <span>DETAIL</span>
                  <input
                    value={draft.detail}
                    onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
                    placeholder="What does keeping it mean?"
                    maxLength={160}
                  />
                </label>
                <label>
                  <span>TARGET</span>
                  <input
                    value={draft.target}
                    onChange={(event) => setDraft({ ...draft, target: event.target.value })}
                    placeholder="30 min"
                    maxLength={80}
                  />
                </label>
              </div>
              <div className="icon-picker">
                <p>CHOOSE AN ICON</p>
                <div>
                  {commitmentIconNames.map((name) => (
                    <button
                      className={draft.icon === name ? 'selected' : ''}
                      key={name}
                      onClick={() => setDraft({ ...draft, icon: name })}
                      aria-label={`Use ${name} icon`}
                      title={name}
                    >
                      <CommitmentIcon name={name} size={17} />
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="form-confirm"
                disabled={!draft.title.trim() || !draft.categoryId}
                onClick={addCommitment}
              >
                Add commitment
              </button>
            </div>
          )}

          <div className="commitment-grid">
            {entry.commitmentCategories.flatMap((category) =>
              category.commitments.map((commitment) => (
                <article
                  className={commitment.completed ? 'commitment complete' : 'commitment'}
                  key={commitment.id}
                >
                  <div className="commitment-topline">
                    <CommitmentIcon name={commitment.icon} />
                    <div className="commitment-controls">
                      <button
                        onClick={() => deleteCommitment(category.id, commitment.id)}
                        aria-label={`Delete ${commitment.title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        aria-label={`Toggle ${commitment.title}`}
                        onClick={() =>
                          updateCommitment(category.id, commitment.id, {
                            completed: !commitment.completed
                          })
                        }
                      >
                        {commitment.completed ? <Check size={13} /> : <Circle size={17} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow">{category.name.toUpperCase()}</p>
                    <h3>{commitment.title}</h3>
                  </div>
                  <div className="commitment-fields">
                    <input
                      value={commitment.detail}
                      onChange={(event) =>
                        updateCommitment(category.id, commitment.id, {
                          detail: event.target.value
                        })
                      }
                      placeholder="Add detail"
                      maxLength={160}
                    />
                    <input
                      value={commitment.target}
                      onChange={(event) =>
                        updateCommitment(category.id, commitment.id, {
                          target: event.target.value
                        })
                      }
                      placeholder="Target"
                      maxLength={80}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="reflection">
          <div>
            <p className="eyebrow">EVENING REFLECTION</p>
            <h3>What moved you forward today?</h3>
          </div>
          <textarea
            value={entry.reflection}
            onChange={(event) => setEntry({ ...entry, reflection: event.target.value })}
            placeholder="Write a few honest lines…"
            maxLength={2000}
          />
        </section>
      </section>
    </main>
  )
}
