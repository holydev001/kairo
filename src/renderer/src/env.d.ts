import type { CommitmentCategory, DailyEntry } from '../../shared/journal'
import type { WeeklyReview } from '../../shared/weekly-review'

declare global {
  interface Window {
    kairo: {
      platform: string
      journal: {
        get(date: string): Promise<DailyEntry>
        list(limit?: number): Promise<DailyEntry[]>
        save(entry: DailyEntry): Promise<DailyEntry>
      }
      weeklyReview: {
        get(weekStart: string): Promise<WeeklyReview>
        save(review: WeeklyReview): Promise<WeeklyReview>
      }
      commitments: {
        get(): Promise<CommitmentCategory[]>
        save(templates: CommitmentCategory[]): Promise<CommitmentCategory[]>
      }
    }
  }
}

export {}
