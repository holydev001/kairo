import koffi from 'koffi'

const user32 = koffi.load('user32.dll')
const HANDLE = koffi.pointer('HANDLE', koffi.opaque())
koffi.alias('HWND', HANDLE)

koffi.proto('bool __stdcall EnumWindowsProc(HWND hwnd, intptr_t lParam)')
const EnumWindows = user32.func(
  'bool __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, intptr_t lParam)'
)
const FindWindowW = user32.func(
  'HWND __stdcall FindWindowW(const char16_t *className, const char16_t *windowName)'
)
const FindWindowExW = user32.func(
  'HWND __stdcall FindWindowExW(HWND parent, HWND childAfter, const char16_t *className, const char16_t *windowName)'
)
const SendMessageTimeoutW = user32.func(
  'uintptr_t __stdcall SendMessageTimeoutW(HWND hwnd, uint message, uintptr_t wParam, intptr_t lParam, uint flags, uint timeout, void *result)'
)
const SetParent = user32.func('HWND __stdcall SetParent(HWND child, HWND newParent)')

function nativeHandle(buffer: Buffer): bigint {
  return buffer.length >= 8 ? buffer.readBigUInt64LE(0) : BigInt(buffer.readUInt32LE(0))
}

function findDesktopWorker(): unknown | null {
  const programManager = FindWindowW('Progman', null)
  if (programManager) {
    SendMessageTimeoutW(programManager, 0x052c, 0, 0, 0, 1000, null)
  }

  let desktopWorker: unknown | null = null
  EnumWindows((topLevelWindow: unknown) => {
    const shellView = FindWindowExW(topLevelWindow, null, 'SHELLDLL_DefView', null)
    if (!shellView) return true
    desktopWorker = FindWindowExW(null, topLevelWindow, 'WorkerW', null)
    return false
  }, 0)
  return desktopWorker
}

export function attachWindowToDesktop(handle: Buffer): boolean {
  const desktopWorker = findDesktopWorker()
  if (!desktopWorker) return false
  SetParent(nativeHandle(handle), desktopWorker)
  return true
}

export function detachWindowFromDesktop(handle: Buffer): void {
  SetParent(nativeHandle(handle), null)
}
