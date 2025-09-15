export function computeChecksum(input: string): string {
  // Simple stable checksum (FNV-1a 32-bit)
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash >>> 0) * 0x01000193
    hash >>>= 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}


