import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell } from 'electron'
import type {
  AppTheme,
  BackupResult,
  QuoteWidgetPreferences,
  WidgetKind,
  WidgetPreferences
} from '../shared/settings'
import type { UpdateState } from '../shared/settings'
import { JournalDatabase } from './database'
import { excludeWindowFromDesktopPeek } from './windows-peek'

const require = createRequire(import.meta.url)
type AutoUpdater = {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  allowPrerelease: boolean
  on(event: 'checking-for-update', listener: () => void): void
  on(event: 'update-not-available', listener: () => void): void
  on(
    event: 'update-available',
    listener: (info: { version: string; releaseDate?: string }) => void
  ): void
  on(event: 'download-progress', listener: (progress: { percent: number }) => void): void
  on(event: 'update-downloaded', listener: (info: { version: string }) => void): void
  on(event: 'error', listener: (error: unknown) => void): void
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}
const { autoUpdater } = require('electron-updater') as { autoUpdater: AutoUpdater }

let journal: JournalDatabase
let mainWindow: BrowserWindow | null = null
let updateState: UpdateState = { status: 'idle' }
let availableUpdateVersion = app.getVersion()
const widgetWindows: Record<WidgetKind, BrowserWindow | null> = {
  checklist: null,
  quote: null
}
const widgetTopLevels: Partial<Record<WidgetKind, 'none' | 'floating' | 'screen-saver'>> = {}
const widgetClosing: Partial<Record<WidgetKind, boolean>> = {}
const widgetPositionTimers: Partial<Record<WidgetKind, NodeJS.Timeout>> = {}
const widgetVisibilityTimers: Partial<Record<WidgetKind, NodeJS.Timeout>> = {}
const backgroundLaunch = process.argv.includes('--widget-background')
let appQuitting = false

app.setName('Kairo')
app.setAppUserModelId('dev.holydev.kairo')

const kairoIcon = nativeImage.createFromDataURL(
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#0b0b0a"/>
      <path d="M44 94V44h64M148 44h64v50M212 162v50h-64M108 212H44v-50" fill="none" stroke="#8f743f" stroke-width="7"/>
      <text x="128" y="161" fill="#d8b568" font-size="104" font-family="Yu Mincho, serif" font-weight="700" text-anchor="middle">改</text>
      <circle cx="207" cy="205" r="8" fill="#d9b86c"/>
    </svg>
  `)}`
)

const windowThemes: Record<AppTheme, { background: string; symbols: string }> = {
  obsidian: { background: '#0d0d0c', symbols: '#8e8b82' },
  ivory: { background: '#e8e1d5', symbols: '#625b51' },
  midnight: { background: '#09131d', symbols: '#8fa6b8' },
  ember: { background: '#160e0b', symbols: '#b58b74' },
  verdant: { background: '#0e1510', symbols: '#8fa192' }
}

const widgetSizes: Record<WidgetKind, Record<WidgetPreferences['size'], [number, number]>> = {
  checklist: {
    compact: [296, 384],
    standard: [370, 480],
    expanded: [440, 620]
  },
  quote: {
    compact: [304, 240],
    standard: [380, 300],
    expanded: [440, 380]
  }
}

function applyWindowTheme(theme: AppTheme): void {
  const colors = windowThemes[theme]
  for (const window of BrowserWindow.getAllWindows()) {
    if (Object.values(widgetWindows).includes(window)) continue
    window.setBackgroundColor(colors.background)
    window.setTitleBarOverlay({ color: colors.background, symbolColor: colors.symbols, height: 44 })
  }
}

type WindowPreferences = WidgetPreferences | QuoteWidgetPreferences

function widgetPreferencesKey(kind: WidgetKind): 'widget' | 'quoteWidget' {
  return kind === 'checklist' ? 'widget' : 'quoteWidget'
}

function saveWidgetRuntime(kind: WidgetKind, patch: Partial<WindowPreferences>): void {
  const preferences = journal.getPreferences()
  const key = widgetPreferencesKey(kind)
  journal.savePreferences({ ...preferences, [key]: { ...preferences[key], ...patch } })
}

function rememberWidgetPosition(kind: WidgetKind): void {
  const widgetWindow = widgetWindows[kind]
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  if (widgetPositionTimers[kind]) clearTimeout(widgetPositionTimers[kind])
  widgetPositionTimers[kind] = setTimeout(() => {
    const [x, y] = widgetWindow.getPosition()
    saveWidgetRuntime(kind, { position: { x, y }, open: true })
    delete widgetPositionTimers[kind]
  }, 180)
}

function keepDesktopWidgetVisible(kind: WidgetKind): void {
  if (widgetVisibilityTimers[kind]) clearInterval(widgetVisibilityTimers[kind])
  widgetVisibilityTimers[kind] = setInterval(() => {
    const widgetWindow = widgetWindows[kind]
    if (!widgetWindow || widgetWindow.isDestroyed() || appQuitting) return
    const preferences = journal.getPreferences()[widgetPreferencesKey(kind)]
    if (preferences.alwaysOnDisplay && !preferences.alwaysOnTop && !widgetWindow.isVisible()) {
      // Windows+D hides ordinary windows as part of the show-desktop animation.
      // Re-showing without activation keeps the widget on the desktop layer.
      widgetWindow.showInactive()
    }
  }, 250)
}

function syncLoginLaunch(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return
  const preferences = journal.getPreferences()
  const openAtLogin = preferences.widget.alwaysOnDisplay || preferences.quoteWidget.alwaysOnDisplay
  app.setLoginItemSettings({
    openAtLogin,
    enabled: openAtLogin,
    path: process.execPath,
    args: ['--widget-background'],
    name: 'Kairo Widgets'
  })
}

function broadcastUpdateState(state: UpdateState): void {
  updateState = state
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('update:state', state)
}

function friendlyUpdateError(error: unknown, action: string): string {
  const detail = error instanceof Error ? error.message : String(error)
  const normalized = detail.toLowerCase()
  console.warn(`[updater] ${action} failed`, detail)
  if (normalized.includes('404') || normalized.includes('latest.yml')) {
    return 'The latest beta is still being published. Try again in a moment.'
  }
  if (
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('authentication')
  ) {
    return 'Kairo could not access the beta release. Check your connection and try again.'
  }
  if (
    normalized.includes('enet') ||
    normalized.includes('econn') ||
    normalized.includes('network')
  ) {
    return 'Kairo could not reach GitHub. Check your connection and try again.'
  }
  return `${action} could not be completed. Try again in a moment.`
}

function configureAutoUpdater(): void {
  if (!app.isPackaged || process.platform !== 'win32') {
    broadcastUpdateState({ status: 'unsupported' })
    return
  }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = app.getVersion().includes('-')
  autoUpdater.on('checking-for-update', () => broadcastUpdateState({ status: 'checking' }))
  autoUpdater.on('update-not-available', () =>
    broadcastUpdateState({ status: 'up-to-date', version: app.getVersion() })
  )
  autoUpdater.on('update-available', (info) => {
    availableUpdateVersion = info.version
    broadcastUpdateState({
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate
    })
  })
  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdateState({
      status: 'downloading',
      version: availableUpdateVersion,
      percent: Math.round(progress.percent)
    })
  })
  autoUpdater.on('update-downloaded', (info) =>
    broadcastUpdateState({ status: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (error) =>
    broadcastUpdateState({ status: 'error', message: friendlyUpdateError(error, 'Update check') })
  )
}

function applyWidgetPreferences(
  kind: WidgetKind,
  preferences: WindowPreferences,
  animate = true
): void {
  const widgetWindow = widgetWindows[kind]
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  const [width, height] = widgetSizes[kind][preferences.size]
  // "Always on desktop" is intentionally a normal window: it belongs to the
  // desktop layer and must never float above another application. Only the
  // explicit "Display over all windows" setting enables topmost behavior.
  const staysVisible = preferences.alwaysOnTop
  const topLevel = preferences.alwaysOnTop ? 'floating' : 'none'
  if (widgetTopLevels[kind] !== topLevel) {
    widgetWindow.setAlwaysOnTop(staysVisible, topLevel === 'none' ? 'normal' : topLevel)
    widgetTopLevels[kind] = topLevel
  }
  if (widgetWindow.getOpacity() !== preferences.opacity) {
    widgetWindow.setOpacity(preferences.opacity)
  }
  const [currentWidth, currentHeight] = widgetWindow.getSize()
  if (currentWidth !== width || currentHeight !== height) {
    widgetWindow.setSize(width, height, animate)
  }
  if (process.platform === 'win32') {
    widgetWindow.setBackgroundMaterial(preferences.blur ? 'acrylic' : 'none')
  }
}

function broadcast(channel: string, value: unknown, excludedWebContentsId?: number): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && window.webContents.id !== excludedWebContentsId) {
      window.webContents.send(channel, value)
    }
  }
}

function createWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  const windowTheme = windowThemes[journal.getPreferences().theme]
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 680,
    minHeight: 620,
    backgroundColor: windowTheme.background,
    icon: kairoIcon,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: windowTheme.background,
      symbolColor: windowTheme.symbols,
      height: 44
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window
  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Renderer failed to load', { errorCode, errorDescription })
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process exited', details)
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}

function createWidgetWindow(kind: WidgetKind): void {
  let widgetWindow = widgetWindows[kind]
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    widgetWindow.focus()
    return
  }

  const appPreferences = journal.getPreferences()
  const preferences = kind === 'checklist' ? appPreferences.widget : appPreferences.quoteWidget
  const [width, height] = widgetSizes[kind][preferences.size]
  const position = preferences.position ?? undefined
  widgetWindow = new BrowserWindow({
    width,
    height,
    ...(position ? { x: position.x, y: position.y } : {}),
    minWidth: kind === 'checklist' ? 296 : 304,
    minHeight: kind === 'checklist' ? 384 : 240,
    maxWidth: 560,
    maxHeight: 720,
    frame: false,
    thickFrame: false,
    transparent: process.platform !== 'win32',
    skipTaskbar: true,
    alwaysOnTop: preferences.alwaysOnTop,
    maximizable: false,
    show: false,
    backgroundColor: '#00000000',
    backgroundMaterial: process.platform === 'win32' && preferences.blur ? 'acrylic' : 'none',
    icon: kairoIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  widgetWindows[kind] = widgetWindow
  widgetClosing[kind] = false
  saveWidgetRuntime(kind, { open: true })
  if (preferences.alwaysOnDisplay) keepDesktopWidgetVisible(kind)
  if (process.platform === 'win32') {
    excludeWindowFromDesktopPeek(widgetWindow.getNativeWindowHandle())
  }

  applyWidgetPreferences(kind, preferences, false)
  widgetWindow.once('ready-to-show', () => {
    const current = journal.getPreferences()[widgetPreferencesKey(kind)]
    if (current.alwaysOnDisplay && !current.alwaysOnTop) widgetWindows[kind]?.showInactive()
    else widgetWindows[kind]?.show()
  })
  widgetWindow.on('move', () => rememberWidgetPosition(kind))
  widgetWindow.on('hide', () => {
    const current = journal.getPreferences()[widgetPreferencesKey(kind)]
    if (current.alwaysOnDisplay && !widgetClosing[kind] && !appQuitting) {
      setTimeout(() => {
        if (widgetWindows[kind] && !widgetWindows[kind]?.isDestroyed())
          widgetWindows[kind]?.showInactive()
      }, 30)
    }
  })
  widgetWindow.on('closed', () => {
    if (!widgetClosing[kind]) rememberWidgetPosition(kind)
    delete widgetTopLevels[kind]
    if (widgetVisibilityTimers[kind]) clearInterval(widgetVisibilityTimers[kind])
    delete widgetVisibilityTimers[kind]
    delete widgetClosing[kind]
    widgetWindows[kind] = null
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void widgetWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?widget=${kind}`)
  } else {
    void widgetWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { widget: kind }
    })
  }
}

app.whenReady().then(async () => {
  journal = await JournalDatabase.open(join(app.getPath('userData'), 'kairo.sqlite'))
  ipcMain.handle('journal:get', (_event, date: string) => journal.get(date))
  ipcMain.handle('journal:list', (_event, limit?: number) => journal.list(limit))
  ipcMain.handle('journal:save', (event, entry: unknown) => {
    const saved = journal.save(entry)
    broadcast('journal:updated', saved, event.sender.id)
    return saved
  })
  ipcMain.handle('weekly-review:get', (_event, weekStart: string) =>
    journal.getWeeklyReview(weekStart)
  )
  ipcMain.handle('weekly-review:save', (_event, review: unknown) =>
    journal.saveWeeklyReview(review)
  )
  ipcMain.handle('commitments:get', () => journal.getCommitmentTemplates())
  ipcMain.handle('commitments:save', (_event, templates: unknown) =>
    journal.saveCommitmentTemplates(templates)
  )
  ipcMain.handle('habits:get', () => journal.getHabits())
  ipcMain.handle('habits:save', (_event, habits: unknown) => journal.saveHabits(habits))
  ipcMain.handle('settings:get', () => journal.getPreferences())
  ipcMain.handle('settings:save', (event, preferences: unknown) => {
    const saved = journal.savePreferences(preferences)
    applyWindowTheme(saved.theme)
    if (saved.widget.alwaysOnDisplay && !widgetWindows.checklist) createWidgetWindow('checklist')
    if (saved.quoteWidget.alwaysOnDisplay && !widgetWindows.quote) createWidgetWindow('quote')
    if (saved.widget.alwaysOnDisplay && widgetWindows.checklist)
      keepDesktopWidgetVisible('checklist')
    if (saved.quoteWidget.alwaysOnDisplay && widgetWindows.quote) keepDesktopWidgetVisible('quote')
    if (!saved.widget.alwaysOnDisplay && widgetVisibilityTimers.checklist) {
      clearInterval(widgetVisibilityTimers.checklist)
      delete widgetVisibilityTimers.checklist
    }
    if (!saved.quoteWidget.alwaysOnDisplay && widgetVisibilityTimers.quote) {
      clearInterval(widgetVisibilityTimers.quote)
      delete widgetVisibilityTimers.quote
    }
    applyWidgetPreferences('checklist', saved.widget)
    applyWidgetPreferences('quote', saved.quoteWidget)
    syncLoginLaunch()
    broadcast('settings:updated', saved, event.sender.id)
    return saved
  })
  ipcMain.handle('settings:info', () => ({
    version: app.getVersion(),
    dataPath: journal.getPath()
  }))
  ipcMain.handle('settings:clear-data', () => {
    journal.clearJournalData()
  })
  ipcMain.handle('settings:create-backup', async (): Promise<BackupResult> => {
    const date = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog({
      title: 'Create a Kairo backup',
      defaultPath: join(app.getPath('documents'), `kairo-backup-${date}.sqlite`),
      buttonLabel: 'Create backup',
      filters: [{ name: 'Kairo database', extensions: ['sqlite'] }]
    })

    if (result.canceled || !result.filePath) return { status: 'cancelled' }

    journal.backup(result.filePath)
    return {
      status: 'saved',
      path: result.filePath,
      createdAt: new Date().toISOString()
    }
  })
  ipcMain.handle('settings:show-data', () => shell.showItemInFolder(journal.getPath()))
  ipcMain.handle('settings:copy-diagnostics', (_event, details: unknown) => {
    if (typeof details !== 'string') return
    clipboard.writeText(details)
  })
  ipcMain.handle('settings:open-feedback', (_event, details: unknown) => {
    const body = typeof details === 'string' ? details : ''
    const url = new URL('https://github.com/holydev001/kairo/issues/new')
    url.searchParams.set('title', 'Kairo beta feedback')
    url.searchParams.set('body', body)
    void shell.openExternal(url.toString())
  })
  ipcMain.handle('update:state', () => updateState)
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged || process.platform !== 'win32') {
      broadcastUpdateState({ status: 'unsupported' })
      return updateState
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      broadcastUpdateState({
        status: 'error',
        message: friendlyUpdateError(error, 'Update check')
      })
    }
    return updateState
  })
  ipcMain.handle('update:download', async () => {
    if (updateState.status !== 'available') return updateState
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      broadcastUpdateState({
        status: 'error',
        message: friendlyUpdateError(error, 'Update download')
      })
    }
    return updateState
  })
  ipcMain.handle('update:install', () => {
    if (updateState.status === 'downloaded') autoUpdater.quitAndInstall(true, true)
  })
  ipcMain.handle('widget:open', (_event, kind: WidgetKind) => createWidgetWindow(kind))
  ipcMain.handle('widget:close', (_event, kind: WidgetKind) => {
    if (!widgetWindows[kind] || widgetWindows[kind]?.isDestroyed()) return
    widgetClosing[kind] = true
    saveWidgetRuntime(kind, { open: false })
    widgetWindows[kind]?.close()
  })
  ipcMain.handle('widget:save-quote-image', async (event) => {
    const widgetWindow = BrowserWindow.fromWebContents(event.sender)
    if (!widgetWindow || widgetWindow.isDestroyed()) return { status: 'cancelled' as const }
    const bounds = widgetWindow.getBounds()
    const image = await widgetWindow.capturePage({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height
    })
    // Export at one predictable, high-resolution width so repeated sharing does
    // not create a progressively smaller or softer image.
    const exportImage = image.resize({ width: 1600 })
    const result = await dialog.showSaveDialog({
      title: 'Save quote image',
      defaultPath: join(
        app.getPath('pictures'),
        `kairo-quote-${new Date().toISOString().slice(0, 10)}.png`
      ),
      buttonLabel: 'Save image',
      filters: [{ name: 'PNG image', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return { status: 'cancelled' as const }
    writeFileSync(result.filePath, exportImage.toPNG())
    return { status: 'saved' as const, path: result.filePath }
  })
  if (!backgroundLaunch) createWindow()
  configureAutoUpdater()
  const preferences = journal.getPreferences()
  syncLoginLaunch()
  // Restore only widgets that were open when Windows last shut down. A clean
  // Kairo launch should never place a new widget in the middle of the screen.
  if (preferences.widget.open) createWidgetWindow('checklist')
  if (preferences.quoteWidget.open) createWidgetWindow('quote')
  app.on('activate', () => createWindow())
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return
  if (!journal) return app.quit()
  const preferences = journal.getPreferences()
  if (!preferences.widget.alwaysOnDisplay && !preferences.quoteWidget.alwaysOnDisplay) app.quit()
})

app.on('before-quit', () => {
  appQuitting = true
  for (const kind of ['checklist', 'quote'] as const) {
    const widgetWindow = widgetWindows[kind]
    if (!widgetWindow || widgetWindow.isDestroyed()) continue
    const [x, y] = widgetWindow.getPosition()
    saveWidgetRuntime(kind, { open: true, position: { x, y } })
  }
})
