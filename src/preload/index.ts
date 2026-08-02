import { contextBridge, ipcRenderer } from 'electron'
import type { DailyEntry } from '../shared/journal'

contextBridge.exposeInMainWorld('kairo', {
  platform: process.platform,
  journal: {
    get: (date: string): Promise<DailyEntry> => ipcRenderer.invoke('journal:get', date),
    list: (limit?: number): Promise<DailyEntry[]> => ipcRenderer.invoke('journal:list', limit),
    save: (entry: DailyEntry): Promise<DailyEntry> => ipcRenderer.invoke('journal:save', entry)
  }
})
