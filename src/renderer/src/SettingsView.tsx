import { useEffect, useState } from 'react'
import {
  Bug,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Flame,
  Lightbulb,
  LoaderCircle,
  Monitor,
  MessageSquareWarning,
  MoonStar,
  ShieldCheck,
  Sprout,
  Sun,
  UserRound
} from 'lucide-react'
import type { AppInfo, AppPreferences, AppTheme, LaunchView } from '../../shared/settings'

const launchViewLabels: Record<LaunchView, string> = {
  command: 'Command Center',
  daily: 'Daily Log',
  commitments: 'Commitments',
  history: 'History',
  weekly: 'Weekly Review'
}

const themes: Array<{
  id: AppTheme
  name: string
  description: string
  colors: [string, string, string]
  icon: typeof MoonStar
}> = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Black, graphite, and quiet gold.',
    colors: ['#0b0b0a', '#1b1914', '#b89550'],
    icon: MoonStar
  },
  {
    id: 'ivory',
    name: 'Ivory',
    description: 'Warm parchment with aged brass.',
    colors: ['#f3efe6', '#d8cebd', '#9b6c20'],
    icon: Sun
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep navy with cool silver-blue.',
    colors: ['#081018', '#142432', '#78a6c8'],
    icon: MoonStar
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm charcoal with burnished copper.',
    colors: ['#120c09', '#281711', '#c77b4b'],
    icon: Flame
  },
  {
    id: 'verdant',
    name: 'Verdant',
    description: 'Forest shadow with quiet sage.',
    colors: ['#0c120e', '#19261e', '#7f9f78'],
    icon: Sprout
  }
]

type SettingsViewProps = {
  hidden: boolean
  preferences: AppPreferences
  hydrated: boolean
  onChange(preferences: AppPreferences): void
}

type FeedbackKind = 'bug' | 'idea' | 'general'

const feedbackKindLabels: Record<FeedbackKind, string> = {
  bug: 'Bug report',
  idea: 'Feature idea',
  general: 'General feedback'
}

export function SettingsView({
  hidden,
  preferences,
  hydrated,
  onChange
}: SettingsViewProps): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [showLaunchMenu, setShowLaunchMenu] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [backupState, setBackupState] = useState<'idle' | 'working' | 'saved' | 'error'>('idle')
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>('bug')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackState, setFeedbackState] = useState<
    'idle' | 'working' | 'copied' | 'opened' | 'error'
  >('idle')

  useEffect(() => {
    if (hidden || info) return
    void window.kairo.settings
      .info()
      .then(setInfo)
      .catch(() => setBackupState('error'))
  }, [hidden, info])

  useEffect(() => {
    if (!hydrated) return
    setSaveState('saving')
    const timeout = window.setTimeout(() => {
      void window.kairo.settings
        .save(preferences)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, 550)
    return () => window.clearTimeout(timeout)
  }, [hydrated, preferences])

  const createBackup = async (): Promise<void> => {
    setBackupState('working')
    try {
      const result = await window.kairo.settings.createBackup()
      if (result.status === 'cancelled') {
        setBackupState('idle')
        return
      }
      const nextPreferences = {
        ...preferences,
        lastBackupAt: result.createdAt,
        lastBackupPath: result.path
      }
      onChange(nextPreferences)
      await window.kairo.settings.save(nextPreferences)
      setBackupState('saved')
    } catch {
      setBackupState('error')
    }
  }

  const lastBackup = preferences.lastBackupAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(preferences.lastBackupAt))
    : 'No backup created yet'

  const feedbackDetails = (): string => {
    const version = info?.version ?? 'unknown'
    const widgetSummary = `checklist=${preferences.widget.size}, quote=${preferences.quoteWidget.size}`
    return [
      `## ${feedbackKindLabels[feedbackKind]}`,
      '',
      feedbackText.trim() || '_No additional description provided._',
      '',
      '---',
      `Kairo version: ${version}`,
      `Platform: ${window.kairo.platform}`,
      `User agent: ${navigator.userAgent}`,
      `Theme: ${preferences.theme}`,
      `Widget sizes: ${widgetSummary}`,
      '',
      '_No journal content is included in this report._'
    ].join('\n')
  }

  const copyFeedback = async (): Promise<void> => {
    setFeedbackState('working')
    try {
      await window.kairo.settings.copyDiagnostics(feedbackDetails())
      setFeedbackState('copied')
    } catch {
      setFeedbackState('error')
    }
  }

  const openFeedback = async (): Promise<void> => {
    setFeedbackState('working')
    try {
      await window.kairo.settings.openFeedback(feedbackDetails())
      setFeedbackState('opened')
    } catch {
      setFeedbackState('error')
    }
  }

  return (
    <div className="settings-view" hidden={hidden}>
      <header className="settings-header">
        <div>
          <p className="eyebrow">YOUR KAIRO</p>
          <h1>Make this space your own.</h1>
          <p>Keep Kairo personal, private, and ready to meet you where your day begins.</p>
        </div>
        <span className={`save-state ${saveState}`}>
          {saveState === 'saving' && <LoaderCircle size={12} />}
          {saveState === 'error' ? 'Save failed' : saveState}
        </span>
      </header>

      <section className="settings-section">
        <div className="settings-section-heading">
          <UserRound size={18} />
          <div>
            <p className="eyebrow">PERSONAL</p>
            <h2>How Kairo greets you.</h2>
          </div>
        </div>
        <div className="settings-fields">
          <label>
            <span>PREFERRED NAME</span>
            <input
              value={preferences.preferredName}
              onChange={(event) => onChange({ ...preferences, preferredName: event.target.value })}
              placeholder="What should Kairo call you?"
              maxLength={60}
            />
            <small>Leave this blank for a quieter greeting.</small>
          </label>
          <div className="select-field">
            <span>OPEN KAIRO ON</span>
            <div className="select-control settings-select">
              <button
                className={showLaunchMenu ? 'select-trigger open' : 'select-trigger'}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={showLaunchMenu}
                onClick={() => setShowLaunchMenu((current) => !current)}
              >
                <span>{launchViewLabels[preferences.launchView]}</span>
                <ChevronDown size={15} />
              </button>
              {showLaunchMenu && (
                <div className="select-menu" role="listbox" aria-label="Opening page">
                  {(Object.keys(launchViewLabels) as LaunchView[]).map((view) => (
                    <button
                      className={preferences.launchView === view ? 'selected' : ''}
                      type="button"
                      role="option"
                      aria-selected={preferences.launchView === view}
                      key={view}
                      onClick={() => {
                        onChange({ ...preferences, launchView: view })
                        setShowLaunchMenu(false)
                      }}
                    >
                      <span>{launchViewLabels[view]}</span>
                      {preferences.launchView === view && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <small>This page will open first the next time Kairo starts.</small>
          </div>
        </div>
      </section>

      <section className="settings-section theme-section">
        <div className="settings-section-heading">
          <Sun size={18} />
          <div>
            <p className="eyebrow">APPEARANCE</p>
            <h2>Choose the atmosphere.</h2>
          </div>
        </div>
        <div className="theme-grid">
          {themes.map((theme) => {
            const ThemeIcon = theme.icon
            const selected = preferences.theme === theme.id
            return (
              <button
                className={selected ? 'theme-option selected' : 'theme-option'}
                key={theme.id}
                onClick={() => onChange({ ...preferences, theme: theme.id })}
                aria-pressed={selected}
              >
                <span className="theme-option-topline">
                  <ThemeIcon size={16} />
                  {selected && <Check size={14} />}
                </span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
                <span className="theme-swatches" aria-hidden="true">
                  {theme.colors.map((color) => (
                    <i key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="settings-section data-section">
        <div className="settings-section-heading">
          <HardDrive size={18} />
          <div>
            <p className="eyebrow">DATA &amp; PRIVACY</p>
            <h2>Your journal stays with you.</h2>
          </div>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={20} />
          <p>
            Kairo stores your journal locally on this computer. Nothing is uploaded by these
            controls.
          </p>
        </div>
        <div className="backup-panel">
          <div>
            <p className="eyebrow">LOCAL BACKUP</p>
            <h3>Preserve your progress.</h3>
            <p>Create a complete copy of your journal wherever you choose.</p>
            <span>{lastBackup}</span>
          </div>
          <button
            className="settings-primary"
            disabled={backupState === 'working'}
            onClick={() => void createBackup()}
          >
            {backupState === 'working' ? <LoaderCircle size={15} /> : <Download size={15} />}
            {backupState === 'working' ? 'Creating backup' : 'Create backup'}
          </button>
        </div>
        {backupState === 'saved' && (
          <p className="settings-message success">Backup created successfully.</p>
        )}
        {backupState === 'error' && (
          <p className="settings-message error">Kairo could not complete that action.</p>
        )}
        <button className="data-location" onClick={() => void window.kairo.settings.showData()}>
          <FolderOpen size={16} />
          <span>
            <small>LOCAL DATA FILE</small>
            <strong>{info?.dataPath ?? 'Loading location…'}</strong>
          </span>
          <i>Reveal</i>
        </button>
      </section>

      <section className="settings-section feedback-section">
        <div className="settings-section-heading">
          <MessageSquareWarning size={18} />
          <div>
            <p className="eyebrow">BETA FEEDBACK</p>
            <h2>Help shape what comes next.</h2>
          </div>
        </div>
        <div className="feedback-panel">
          <p>
            Tell us what happened or what you would like to see. Kairo adds only technical context
            to the report; your journal entries stay out of it.
          </p>
          <div className="feedback-kind-list" role="group" aria-label="Feedback type">
            {(Object.keys(feedbackKindLabels) as FeedbackKind[]).map((kind) => {
              const Icon = kind === 'bug' ? Bug : kind === 'idea' ? Lightbulb : MessageSquareWarning
              return (
                <button
                  className={feedbackKind === kind ? 'feedback-kind selected' : 'feedback-kind'}
                  key={kind}
                  type="button"
                  aria-pressed={feedbackKind === kind}
                  onClick={() => setFeedbackKind(kind)}
                >
                  <Icon size={14} />
                  {feedbackKindLabels[kind]}
                </button>
              )
            })}
          </div>
          <textarea
            className="feedback-textarea"
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            placeholder="What should we know?"
            maxLength={2000}
            rows={5}
          />
          <div className="feedback-actions">
            <button
              className="settings-secondary"
              type="button"
              onClick={() => void copyFeedback()}
            >
              <Copy size={14} />
              Copy report
            </button>
            <button className="settings-primary" type="button" onClick={() => void openFeedback()}>
              <ExternalLink size={14} />
              Open GitHub issue
            </button>
          </div>
          <p className={`settings-message ${feedbackState === 'error' ? 'error' : 'success'}`}>
            {feedbackState === 'copied' && 'Diagnostic report copied to your clipboard.'}
            {feedbackState === 'opened' && 'GitHub opened with a prepared issue draft.'}
            {feedbackState === 'error' && 'Kairo could not prepare the feedback report.'}
          </p>
        </div>
      </section>

      <section className="settings-footer">
        <Monitor size={17} />
        <div>
          <strong>Kairo {info ? `v${info.version}` : ''}</strong>
          <span>Local-first personal command center</span>
        </div>
      </section>
    </div>
  )
}
