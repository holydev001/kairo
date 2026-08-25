import koffi from 'koffi'

const dwmapi = koffi.load('dwmapi.dll')
const user32 = koffi.load('user32.dll')
const HANDLE = koffi.pointer('HANDLE', koffi.opaque())
koffi.alias('HWND', HANDLE)

const DwmSetWindowAttribute = dwmapi.func(
  'long __stdcall DwmSetWindowAttribute(HWND hwnd, uint attribute, const void *value, uint size)'
)

const DWMWA_DISALLOW_PEEK = 11
const DWMWA_EXCLUDED_FROM_PEEK = 12

const FindWindowW = user32.func('__stdcall', 'FindWindowW', HANDLE, ['str16', 'str16'])
const FindWindowExW = user32.func('__stdcall', 'FindWindowExW', HANDLE, [
  HANDLE,
  HANDLE,
  'str16',
  'str16'
])
const SendMessageW = user32.func('__stdcall', 'SendMessageW', 'intptr_t', [
  HANDLE,
  'uint',
  'uintptr_t',
  'intptr_t'
])
const SetParent = user32.func('__stdcall', 'SetParent', HANDLE, [HANDLE, HANDLE])
const EnumWindowsProc = koffi.proto('__stdcall', 'EnumWindowsProc', 'bool', [HANDLE, 'intptr_t'])
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'bool', [
  koffi.pointer(EnumWindowsProc),
  'intptr_t'
])
const GetWindowLongPtrW = user32.func('__stdcall', 'GetWindowLongPtrW', 'intptr_t', [HANDLE, 'int'])
const SetWindowLongPtrW = user32.func('__stdcall', 'SetWindowLongPtrW', 'intptr_t', [
  HANDLE,
  'int',
  'intptr_t'
])

const WM_SHELL = 0x052c
const GWL_STYLE = -16
const WS_CHILD = 0x40000000
const WS_POPUP = 0x80000000

function nativeHandle(buffer: Buffer): bigint {
  return buffer.length >= 8 ? buffer.readBigUInt64LE(0) : BigInt(buffer.readUInt32LE(0))
}

export function excludeWindowFromDesktopPeek(handle: Buffer): void {
  const enabled = Buffer.alloc(4)
  enabled.writeInt32LE(1)
  const windowHandle = nativeHandle(handle)
  DwmSetWindowAttribute(windowHandle, DWMWA_DISALLOW_PEEK, enabled, enabled.byteLength)
  DwmSetWindowAttribute(windowHandle, DWMWA_EXCLUDED_FROM_PEEK, enabled, enabled.byteLength)
}

/**
 * Put a widget on the Windows desktop WorkerW layer. Unlike topmost mode this
 * keeps the widget below normal applications, while making it survive the
 * Show Desktop (Win+D) transition as part of the desktop itself.
 */
export function setWindowDesktopLayer(handle: Buffer, enabled: boolean): void {
  if (process.platform !== 'win32') return
  const windowHandle = nativeHandle(handle)
  if (!enabled) {
    const style = Number(GetWindowLongPtrW(windowHandle, GWL_STYLE))
    SetWindowLongPtrW(windowHandle, GWL_STYLE, BigInt((style | WS_POPUP) & ~WS_CHILD))
    SetParent(windowHandle, null)
    return
  }

  const progman = FindWindowW('Progman', 'Program Manager')
  if (!progman) return
  SendMessageW(progman, WM_SHELL, 0, 0)

  let workerWindow: bigint | null = null
  const callback = koffi.register((window: bigint) => {
    const shellView = FindWindowExW(window, null, 'SHELLDLL_DefView', null)
    if (!shellView) return true
    workerWindow = FindWindowExW(null, window, 'WorkerW', null)
    return false
  }, koffi.pointer(EnumWindowsProc))
  EnumWindows(callback, 0)
  koffi.unregister(callback)
  if (!workerWindow) return

  const style = Number(GetWindowLongPtrW(windowHandle, GWL_STYLE))
  SetWindowLongPtrW(windowHandle, GWL_STYLE, BigInt((style | WS_CHILD) & ~WS_POPUP))
  SetParent(windowHandle, workerWindow)
}
