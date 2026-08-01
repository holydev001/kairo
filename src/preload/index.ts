import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('kairo', { platform: process.platform })
