import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import type { CommitmentCategory } from '../../shared/journal'
import { commitmentIconNames } from './commitment-icon-library'
import { CommitmentIcon } from './commitment-icons'

export function CommitmentsView({ hidden }: { hidden: boolean }): React.JSX.Element {
  const [templates, setTemplates] = useState<CommitmentCategory[]>([])
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [hydrated, setHydrated] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showCommitmentForm, setShowCommitmentForm] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [draft, setDraft] = useState({
    title: '',
    detail: '',
    target: '',
    icon: 'lightning',
    categoryId: ''
  })

  const commitments = useMemo(
    () => templates.flatMap((category) => category.commitments),
    [templates]
  )
  const selectedCategory = templates.find((category) => category.id === draft.categoryId)

  useEffect(() => {
    if (hidden) return
    setHydrated(false)
    setStatus('loading')
    void window.kairo.commitments
      .get()
      .then((value) => {
        setTemplates(value)
        setDraft((current) => ({
          ...current,
          categoryId: current.categoryId || value[0]?.id || ''
        }))
        setHydrated(true)
        setStatus('saved')
      })
      .catch(() => setStatus('error'))
  }, [hidden])

  useEffect(() => {
    if (!hydrated) return
    setStatus('saving')
    const timeout = window.setTimeout(() => {
      void window.kairo.commitments
        .save(templates)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [hydrated, templates])

  const addCategory = (): void => {
    const name = categoryName.trim()
    if (!name) return
    const id = crypto.randomUUID()
    setTemplates((current) => [...current, { id, name, commitments: [] }])
    setDraft((current) => ({ ...current, categoryId: id }))
    setCategoryName('')
    setShowCategoryForm(false)
  }

  const deleteCategory = (categoryId: string): void => {
    setTemplates((current) => current.filter((category) => category.id !== categoryId))
    setDraft((current) => ({
      ...current,
      categoryId:
        current.categoryId === categoryId
          ? (templates.find((category) => category.id !== categoryId)?.id ?? '')
          : current.categoryId
    }))
  }

  const addCommitment = (): void => {
    const title = draft.title.trim()
    if (!title || !draft.categoryId) return
    setTemplates((current) =>
      current.map((category) =>
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
    )
    setDraft((current) => ({ ...current, title: '', detail: '', target: '', icon: 'lightning' }))
    setShowCommitmentForm(false)
  }

  const updateCommitment = (
    categoryId: string,
    commitmentId: string,
    patch: Partial<CommitmentCategory['commitments'][number]>
  ): void => {
    setTemplates((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              commitments: category.commitments.map((commitment) =>
                commitment.id === commitmentId ? { ...commitment, ...patch } : commitment
              )
            }
          : category
      )
    )
  }

  const deleteCommitment = (categoryId: string, commitmentId: string): void => {
    setTemplates((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              commitments: category.commitments.filter((item) => item.id !== commitmentId)
            }
          : category
      )
    )
  }

  return (
    <div className="commitments-view" hidden={hidden}>
      <header className="commitments-view-header">
        <div>
          <p className="eyebrow">COMMITMENT LIBRARY</p>
          <h1>What follows you forward.</h1>
          <p>Define the actions that should appear whenever a new day begins.</p>
        </div>
        <div className="commitments-view-actions">
          <span className={`save-state ${status}`}>
            {status === 'saving' && <LoaderCircle size={12} />}
            {status === 'loading' ? 'Opening library' : status === 'error' ? 'Save failed' : status}
          </span>
          <button onClick={() => setShowCategoryForm(true)}>
            <Plus size={13} /> CATEGORY
          </button>
          <button className="primary" onClick={() => setShowCommitmentForm(true)}>
            <Plus size={13} /> COMMITMENT
          </button>
        </div>
      </header>

      <section className="commitments-view-summary">
        <div>
          <span>CATEGORIES</span>
          <strong>{templates.length}</strong>
        </div>
        <div>
          <span>ACTIVE TEMPLATES</span>
          <strong>{commitments.length}</strong>
        </div>
        <p>Changes apply to new daily entries. Past records remain untouched.</p>
      </section>

      {showCategoryForm && (
        <div className="inline-form library-category-form">
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
        <div className="commitment-form library-commitment-form">
          <div className="form-heading">
            <div>
              <p className="eyebrow">NEW TEMPLATE</p>
              <h3>Define a repeatable commitment.</h3>
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
                  onClick={() => setShowCategoryMenu((current) => !current)}
                  type="button"
                >
                  <span>{selectedCategory?.name ?? 'Choose category'}</span>
                  <ChevronDown size={15} />
                </button>
                {showCategoryMenu && (
                  <div className="select-menu" role="listbox">
                    {templates.map((category) => (
                      <button
                        className={category.id === draft.categoryId ? 'selected' : ''}
                        key={category.id}
                        onClick={() => {
                          setDraft({ ...draft, categoryId: category.id })
                          setShowCategoryMenu(false)
                        }}
                        type="button"
                        role="option"
                        aria-selected={category.id === draft.categoryId}
                      >
                        <span>{category.name}</span>
                        {category.id === draft.categoryId && <Check size={13} />}
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
                  title={name}
                  aria-label={`Use ${name} icon`}
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

      <section className="library-categories">
        <div className="library-section-heading">
          <div>
            <p className="eyebrow">CATEGORIES</p>
            <h2>Organize the practice.</h2>
          </div>
        </div>
        <div>
          {templates.map((category) => (
            <div key={category.id}>
              <span>{category.name}</span>
              <small>{category.commitments.length}</small>
              <button
                onClick={() => deleteCategory(category.id)}
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="library-templates">
        <div className="library-section-heading">
          <div>
            <p className="eyebrow">TEMPLATES</p>
            <h2>The actions that return each day.</h2>
          </div>
          <span>{commitments.length} TOTAL</span>
        </div>
        <div className="commitment-grid">
          {templates.flatMap((category) =>
            category.commitments.map((commitment) => (
              <article className="commitment" key={commitment.id}>
                <div className="commitment-topline">
                  <CommitmentIcon name={commitment.icon} />
                  <button
                    onClick={() => deleteCommitment(category.id, commitment.id)}
                    aria-label={`Delete ${commitment.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div>
                  <p className="eyebrow">{category.name.toUpperCase()}</p>
                  <input
                    className="library-title-input"
                    value={commitment.title}
                    onChange={(event) =>
                      updateCommitment(category.id, commitment.id, { title: event.target.value })
                    }
                    maxLength={80}
                  />
                </div>
                <div className="commitment-fields">
                  <input
                    value={commitment.detail}
                    onChange={(event) =>
                      updateCommitment(category.id, commitment.id, { detail: event.target.value })
                    }
                    placeholder="Add detail"
                    maxLength={160}
                  />
                  <input
                    value={commitment.target}
                    onChange={(event) =>
                      updateCommitment(category.id, commitment.id, { target: event.target.value })
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
    </div>
  )
}
