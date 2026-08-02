import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, nativeImage, shell } from 'electron'
import { JournalDatabase } from './database'

let journal: JournalDatabase

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

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 680,
    minHeight: 620,
    backgroundColor: '#0b0b0a',
    icon: kairoIcon,
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
