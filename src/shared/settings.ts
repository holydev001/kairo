import { z } from 'zod'

export const launchViewSchema = z.enum(['command', 'daily', 'commitments', 'history', 'weekly'])
export const themeSchema = z.enum(['obsidian', 'ivory', 'midnight', 'ember'])

export const appPreferencesSchema = z.object({
  preferredName: z.string().trim().max(60),
  launchView: launchViewSchema,
  theme: themeSchema.default('obsidian'),
  lastBackupAt: z.string().nullable(),
  lastBackupPath: z.string().max(500)
})

export type LaunchView = z.infer<typeof launchViewSchema>
export type AppTheme = z.infer<typeof themeSchema>
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
    theme: 'obsidian',
    lastBackupAt: null,
    lastBackupPath: ''
  }
}
