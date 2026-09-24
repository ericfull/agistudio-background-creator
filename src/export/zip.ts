import { zipSync } from 'fflate'

export async function zipFiles(files: Record<string, Blob | string>): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {}
  for (const [name, data] of Object.entries(files)) {
    entries[name] = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer())
  }
  return new Blob([zipSync(entries, { level: 6 }) as BlobPart], { type: 'application/zip' })
}
