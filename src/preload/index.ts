import { contextBridge, ipcRenderer } from 'electron'
import type { CommitmentCategory, DailyEntry } from '../shared/journal'
import type { WeeklyReview } from '../shared/weekly-review'
import type {
  AppInfo,
  AppPreferences,
  BackupResult,
  UpdateState,
  WidgetKind
} from '../shared/settings'

contextBridge.exposeInMainWorld('kairo', {
  platform: process.platform,
  journal: {
    get: (date: string): Promise<DailyEntry> => ipcRenderer.invoke('journal:get', date),
    list: (limit?: number): Promise<DailyEntry[]> => ipcRenderer.invoke('journal:list', limit),
    save: (entry: DailyEntry): Promise<DailyEntry> => ipcRenderer.invoke('journal:save', entry),
    onUpdated: (listener: (entry: DailyEntry) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, entry: DailyEntry): void =>
        listener(entry)
      ipcRenderer.on('journal:updated', handler)
      return () => ipcRenderer.removeListener('journal:updated', handler)
    }
  },
  weeklyReview: {
    get: (weekStart: string): Promise<WeeklyReview> =>
      ipcRenderer.invoke('weekly-review:get', weekStart),
    save: (review: WeeklyReview): Promise<WeeklyReview> =>
      ipcRenderer.invoke('weekly-review:save', review)
  },
  commitments: {
    get: (): Promise<CommitmentCategory[]> => ipcRenderer.invoke('commitments:get'),
    save: (templates: CommitmentCategory[]): Promise<CommitmentCategory[]> =>
      ipcRenderer.invoke('commitments:save', templates)
  },
  settings: {
    get: (): Promise<AppPreferences> => ipcRenderer.invoke('settings:get'),
    save: (preferences: AppPreferences): Promise<AppPreferences> =>
      ipcRenderer.invoke('settings:save', preferences),
    info: (): Promise<AppInfo> => ipcRenderer.invoke('settings:info'),
    createBackup: (): Promise<BackupResult> => ipcRenderer.invoke('settings:create-backup'),
    showData: (): Promise<void> => ipcRenderer.invoke('settings:show-data'),
    copyDiagnostics: (details: string): Promise<void> =>
      ipcRenderer.invoke('settings:copy-diagnostics', details),
    openFeedback: (details: string): Promise<void> =>
      ipcRenderer.invoke('settings:open-feedback', details),
    onUpdated: (listener: (preferences: AppPreferences) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, preferences: AppPreferences): void =>
        listener(preferences)
      ipcRenderer.on('settings:updated', handler)
      return () => ipcRenderer.removeListener('settings:updated', handler)
    }
  },
  update: {
    getState: (): Promise<UpdateState> => ipcRenderer.invoke('update:state'),
    check: (): Promise<UpdateState> => ipcRenderer.invoke('update:check'),
    download: (): Promise<UpdateState> => ipcRenderer.invoke('update:download'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    onState: (listener: (state: UpdateState) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: UpdateState): void =>
        listener(state)
      ipcRenderer.on('update:state', handler)
      return () => ipcRenderer.removeListener('update:state', handler)
    }
  },
  widget: {
    open: (kind: WidgetKind): Promise<void> => ipcRenderer.invoke('widget:open', kind),
    close: (kind: WidgetKind): Promise<void> => ipcRenderer.invoke('widget:close', kind)
  }
})
