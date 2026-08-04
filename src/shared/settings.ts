import { z } from 'zod'

export const launchViewSchema = z.enum(['command', 'daily', 'commitments', 'history', 'weekly'])
export const themeSchema = z.enum(['obsidian', 'ivory', 'midnight', 'ember', 'verdant'])
export const widgetSizeSchema = z.enum(['compact', 'standard', 'expanded'])
export const widgetKindSchema = z.enum(['checklist', 'quote'])
export const quoteModeSchema = z.enum(['daily', 'custom', 'scripture'])

export const widgetPreferencesSchema = z.object({
  size: widgetSizeSchema,
  alwaysOnDisplay: z.boolean().default(false),
  alwaysOnTop: z.boolean().default(false),
  translucent: z.boolean(),
  blur: z.boolean(),
  blurIntensity: z.number().min(0).max(40).default(22),
  opacity: z.number().min(0.65).max(1),
  backgroundOpacity: z.number().min(0.2).max(1).default(0.78),
  showIntention: z.boolean(),
  showDetails: z.boolean()
})

export type WidgetPreferences = z.infer<typeof widgetPreferencesSchema>
export type WidgetKind = z.infer<typeof widgetKindSchema>

export function createDefaultWidgetPreferences(): WidgetPreferences {
  return {
    size: 'standard',
    alwaysOnDisplay: false,
    alwaysOnTop: false,
    translucent: true,
    blur: true,
    blurIntensity: 22,
    opacity: 0.94,
    backgroundOpacity: 0.78,
    showIntention: true,
    showDetails: true
  }
}

export const quoteWidgetPreferencesSchema = z.object({
  size: widgetSizeSchema,
  alwaysOnDisplay: z.boolean().default(false),
  alwaysOnTop: z.boolean().default(false),
  translucent: z.boolean(),
  blur: z.boolean(),
  blurIntensity: z.number().min(0).max(40).default(22),
  opacity: z.number().min(0.65).max(1),
  backgroundOpacity: z.number().min(0.2).max(1).default(0.78),
  mode: quoteModeSchema,
  customContent: z.string().max(500),
  attribution: z.string().max(120)
})

export type QuoteWidgetPreferences = z.infer<typeof quoteWidgetPreferencesSchema>

export function createDefaultQuoteWidgetPreferences(): QuoteWidgetPreferences {
  return {
    size: 'standard',
    alwaysOnDisplay: false,
    alwaysOnTop: false,
    translucent: true,
    blur: true,
    blurIntensity: 22,
    opacity: 0.94,
    backgroundOpacity: 0.78,
    mode: 'daily',
    customContent: '',
    attribution: ''
  }
}

export const appPreferencesSchema = z.object({
  preferredName: z.string().trim().max(60),
  launchView: launchViewSchema,
  theme: themeSchema.default('obsidian'),
  widget: widgetPreferencesSchema.default(createDefaultWidgetPreferences),
  quoteWidget: quoteWidgetPreferencesSchema.default(createDefaultQuoteWidgetPreferences),
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
    quoteWidget: createDefaultQuoteWidgetPreferences(),
    lastBackupAt: null,
    lastBackupPath: ''
  }
}
