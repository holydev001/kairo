import type { DailyEntry } from '../../shared/journal'

declare global {
  interface Window {
    kairo: {
      platform: string
      journal: {
        get(date: string): Promise<DailyEntry>
        list(limit?: number): Promise<DailyEntry[]>
        save(entry: DailyEntry): Promise<DailyEntry>
      }
    }
  }
}

export {}
