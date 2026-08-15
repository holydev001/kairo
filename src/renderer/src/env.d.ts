import type { CommitmentCategory, DailyEntry } from '../../shared/journal'
import type { WeeklyReview } from '../../shared/weekly-review'
import type {
  AppInfo,
  AppPreferences,
  BackupResult,
  UpdateState,
  WidgetKind
} from '../../shared/settings'

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
        copyDiagnostics(details: string): Promise<void>
        openFeedback(details: string): Promise<void>
        onUpdated(listener: (preferences: AppPreferences) => void): () => void
      }
      widget: {
        open(kind: WidgetKind): Promise<void>
        close(kind: WidgetKind): Promise<void>
        saveQuoteImage(): Promise<{ status: 'cancelled' | 'saved'; path?: string }>
      }
      update: {
        getState(): Promise<UpdateState>
        check(): Promise<UpdateState>
        download(): Promise<UpdateState>
        install(): Promise<void>
        onState(listener: (state: UpdateState) => void): () => void
      }
    }
  }
}

export {}
