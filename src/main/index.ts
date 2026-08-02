import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { JournalDatabase } from './database'

let journal: JournalDatabase

app.setName('Kairo')

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 680,
    minHeight: 620,
    backgroundColor: '#0b0b0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0b0b0a', symbolColor: '#8e8b82', height: 44 },
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

app.whenReady().then(async () => {
  journal = await JournalDatabase.open(join(app.getPath('userData'), 'kairo.sqlite'))
  ipcMain.handle('journal:get', (_event, date: string) => journal.get(date))
  ipcMain.handle('journal:save', (_event, entry: unknown) => journal.save(entry))
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
