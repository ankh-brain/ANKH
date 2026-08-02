export interface BoardSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  thumbnail: string | null
}

export interface Board extends BoardSummary {
  /** A tldraw editor snapshot, or null for a board that has never been saved. */
  snapshot: unknown | null
}

export interface Revision {
  id: number
  createdAt: number
  size?: number
}

export interface TemplateShape {
  id?: string
  type: string
  x: number
  y: number
  parentId?: string
  rotation?: number
  /** Sugar for props.richText, so template files stay readable. */
  text?: string
  props?: Record<string, unknown>
}

export interface Template {
  id: string
  name: string
  description?: string
  order?: number
  shapes: TemplateShape[]
}

export interface ShareInfo {
  /** True when the server was started with sharing switched on. */
  enabled: boolean
  maxPeers: number
  /** The address the other person types in, e.g. http://192.168.1.20:4900 */
  url: string | null
}
