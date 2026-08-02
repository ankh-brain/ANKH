import type { TLAssetStore } from 'tldraw'

/**
 * Where images pasted onto a board are kept. On a shared board the other
 * person's browser has to be able to fetch them, so they go to the local server
 * rather than being inlined as base64 in the document.
 */
export const assetStore: TLAssetStore = {
  async upload(_asset, file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80)
    const name = `${crypto.randomUUID()}-${safeName || 'asset'}`

    const response = await fetch(`/api/assets/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })

    if (!response.ok) throw new Error(`Could not save that file (${response.status})`)
    return (await response.json()) as { src: string }
  },

  resolve(asset) {
    return asset.props.src
  },
}
