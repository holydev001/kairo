import { z } from 'zod'

export const launchViewSchema = z.enum(['command', 'daily', 'commitments', 'history', 'weekly'])

export const appPreferencesSchema = z.object({
  preferredName: z.string().trim().max(60),
  launchView: launchViewSchema,
  lastBackupAt: z.string().nullable(),
  lastBackupPath: z.string().max(500)
})

export type LaunchView = z.infer<typeof launchViewSchema>
export type AppPreferences = z.infer<typeof appPreferencesSchema>

export type BackupResult =
  { status: 'cancelled' } | { status: 'saved'; path: string; createdAt: string }

export type AppInfo = {
  version: string
  dataPath: string
}

export function createDefaultPreferences(): AppPreferences {
  return {
    preferredName: '',
    launchView: 'command',
    lastBackupAt: null,
    lastBackupPath: ''
  }
}
