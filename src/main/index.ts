import { join } from 'node:path'
import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell } from 'electron'
import type {
  AppTheme,
  BackupResult,
  QuoteWidgetPreferences,
  WidgetKind,
  WidgetPreferences
} from '../shared/settings'
import { JournalDatabase } from './database'
import { excludeWindowFromDesktopPeek } from './windows-peek'

let journal: JournalDatabase
let mainWindow: BrowserWindow | null = null
const widgetWindows: Record<WidgetKind, BrowserWindow | null> = {
  checklist: null,
  quote: null
}
const widgetTopLevels: Partial<Record<WidgetKind, 'none' | 'floating' | 'screen-saver'>> = {}
const backgroundLaunch = process.argv.includes('--widget-background')

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

function applyWidgetPreferences(
  kind: WidgetKind,
  preferences: WindowPreferences,
  animate = true
): void {
  const widgetWindow = widgetWindows[kind]
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  const [width, height] = widgetSizes[kind][preferences.size]
  const staysVisible = preferences.alwaysOnDisplay || preferences.alwaysOnTop
  const topLevel = preferences.alwaysOnDisplay
    ? 'screen-saver'
    : preferences.alwaysOnTop
      ? 'floating'
      : 'none'
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
  widgetWindow = new BrowserWindow({
    width,
    height,
    minWidth: kind === 'checklist' ? 296 : 304,
    minHeight: kind === 'checklist' ? 384 : 240,
    maxWidth: 560,
    maxHeight: 720,
    frame: false,
    thickFrame: false,
    transparent: process.platform !== 'win32',
    skipTaskbar: true,
    alwaysOnTop: preferences.alwaysOnDisplay || preferences.alwaysOnTop,
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
  if (process.platform === 'win32') {
    excludeWindowFromDesktopPeek(widgetWindow.getNativeWindowHandle())
  }

  applyWidgetPreferences(kind, preferences, false)
  widgetWindow.once('ready-to-show', () => widgetWindows[kind]?.show())
  widgetWindow.on('closed', () => {
    delete widgetTopLevels[kind]
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
  ipcMain.handle('settings:get', () => journal.getPreferences())
  ipcMain.handle('settings:save', (event, preferences: unknown) => {
    const saved = journal.savePreferences(preferences)
    applyWindowTheme(saved.theme)
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
  ipcMain.handle('widget:open', (_event, kind: WidgetKind) => createWidgetWindow(kind))
  ipcMain.handle('widget:close', (_event, kind: WidgetKind) => widgetWindows[kind]?.close())
  if (!backgroundLaunch) createWindow()
  const preferences = journal.getPreferences()
  syncLoginLaunch()
  if (preferences.widget.alwaysOnDisplay) createWidgetWindow('checklist')
  if (preferences.quoteWidget.alwaysOnDisplay) createWidgetWindow('quote')
  app.on('activate', () => createWindow())
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return
  if (!journal) return app.quit()
  const preferences = journal.getPreferences()
  if (!preferences.widget.alwaysOnDisplay && !preferences.quoteWidget.alwaysOnDisplay) app.quit()
})
