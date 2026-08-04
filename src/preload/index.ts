import { contextBridge, ipcRenderer } from 'electron'
import type { CommitmentCategory, DailyEntry } from '../shared/journal'
import type { WeeklyReview } from '../shared/weekly-review'

contextBridge.exposeInMainWorld('kairo', {
  platform: process.platform,
  journal: {
    get: (date: string): Promise<DailyEntry> => ipcRenderer.invoke('journal:get', date),
    list: (limit?: number): Promise<DailyEntry[]> => ipcRenderer.invoke('journal:list', limit),
    save: (entry: DailyEntry): Promise<DailyEntry> => ipcRenderer.invoke('journal:save', entry)
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
  }
})
