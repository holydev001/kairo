import koffi from 'koffi'

const dwmapi = koffi.load('dwmapi.dll')
const HANDLE = koffi.pointer('HANDLE', koffi.opaque())
koffi.alias('HWND', HANDLE)

const DwmSetWindowAttribute = dwmapi.func(
  'long __stdcall DwmSetWindowAttribute(HWND hwnd, uint attribute, const void *value, uint size)'
)

const DWMWA_DISALLOW_PEEK = 11
const DWMWA_EXCLUDED_FROM_PEEK = 12

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
