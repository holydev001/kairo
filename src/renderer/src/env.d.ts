import type { DailyEntry } from '../../shared/journal'

declare global {
  interface Window {
    kairo: {
      platform: string
      journal: {
        get(date: string): Promise<DailyEntry>
        save(entry: DailyEntry): Promise<DailyEntry>
      }
    }
  }
}

export {}
