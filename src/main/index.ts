import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import type { AppTheme, BackupResult } from '../shared/settings'
import { JournalDatabase } from './database'

let journal: JournalDatabase
let widgetWindow: BrowserWindow | null = null

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

function applyWindowTheme(theme: AppTheme): void {
  const colors = windowThemes[theme]
  for (const window of BrowserWindow.getAllWindows()) {
    window.setBackgroundColor(colors.background)
    window.setTitleBarOverlay({ color: colors.background, symbolColor: colors.symbols, height: 44 })
  }
}

function broadcast(channel: string, value: unknown, excludedWebContentsId?: number): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && window.webContents.id !== excludedWebContentsId) {
      window.webContents.send(channel, value)
    }
  }
}

function createWindow(): void {
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
}

function createWidgetWindow(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    widgetWindow.focus()
    return
  }

  const windowTheme = windowThemes[journal.getPreferences().theme]
  widgetWindow = new BrowserWindow({
    width: 390,
    height: 570,
    minWidth: 320,
    minHeight: 420,
    maxWidth: 520,
    alwaysOnTop: true,
    maximizable: false,
    show: false,
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

  widgetWindow.setAlwaysOnTop(true, 'floating')
  widgetWindow.once('ready-to-show', () => widgetWindow?.show())
  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void widgetWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=widget`)
  } else {
    void widgetWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { view: 'widget' }
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
  ipcMain.handle('widget:open', () => createWidgetWindow())
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
