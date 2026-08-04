import type { CommitmentCategory, DailyEntry } from '../../shared/journal'
import type { WeeklyReview } from '../../shared/weekly-review'
import type { AppInfo, AppPreferences, BackupResult, WidgetKind } from '../../shared/settings'

declare global {
  interface Window {
    kairo: {
      platform: string
      journal: {
        get(date: string): Promise<DailyEntry>
        list(limit?: number): Promise<DailyEntry[]>
        save(entry: DailyEntry): Promise<DailyEntry>
        onUpdated(listener: (entry: DailyEntry) => void): () => void
      }
      weeklyReview: {
        get(weekStart: string): Promise<WeeklyReview>
        save(review: WeeklyReview): Promise<WeeklyReview>
      }
      commitments: {
        get(): Promise<CommitmentCategory[]>
        save(templates: CommitmentCategory[]): Promise<CommitmentCategory[]>
      }
      settings: {
        get(): Promise<AppPreferences>
        save(preferences: AppPreferences): Promise<AppPreferences>
        info(): Promise<AppInfo>
        createBackup(): Promise<BackupResult>
        showData(): Promise<void>
        onUpdated(listener: (preferences: AppPreferences) => void): () => void
      }
      widget: {
        open(kind: WidgetKind): Promise<void>
        close(kind: WidgetKind): Promise<void>
        openSettings(kind: WidgetKind): Promise<void>
        onSettingsRequested(listener: (kind: WidgetKind) => void): () => void
      }
    }
  }
}

export {}
