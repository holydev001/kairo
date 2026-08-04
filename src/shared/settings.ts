import { z } from 'zod'

export const launchViewSchema = z.enum(['command', 'daily', 'commitments', 'history', 'weekly'])
export const themeSchema = z.enum(['obsidian', 'ivory', 'midnight', 'ember', 'verdant'])
export const widgetSizeSchema = z.enum(['compact', 'standard', 'expanded'])

export const widgetPreferencesSchema = z.object({
  size: widgetSizeSchema,
  alwaysOnTop: z.boolean(),
  translucent: z.boolean(),
  blur: z.boolean(),
  opacity: z.number().min(0.65).max(1),
  showIntention: z.boolean(),
  showDetails: z.boolean()
})

export type WidgetPreferences = z.infer<typeof widgetPreferencesSchema>

export function createDefaultWidgetPreferences(): WidgetPreferences {
  return {
    size: 'standard',
    alwaysOnTop: false,
    translucent: true,
    blur: true,
    opacity: 0.94,
    showIntention: true,
    showDetails: true
  }
}

export const appPreferencesSchema = z.object({
  preferredName: z.string().trim().max(60),
  launchView: launchViewSchema,
  theme: themeSchema.default('obsidian'),
  widget: widgetPreferencesSchema.default(createDefaultWidgetPreferences),
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
    widget: createDefaultWidgetPreferences(),
    lastBackupAt: null,
    lastBackupPath: ''
  }
}
