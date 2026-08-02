import type { Board, BoardSummary, Revision, ShareInfo, Template } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${init?.method ?? 'GET'} ${url} failed (${response.status}) ${detail}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  listBoards: () => request<BoardSummary[]>('/api/boards'),

  getBoard: (id: string) => request<Board>(`/api/boards/${id}`),

  createBoard: (name: string) =>
    request<Board>('/api/boards', { method: 'POST', body: JSON.stringify({ name }) }),

  renameBoard: (id: string, name: string) =>
    request<Board>(`/api/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  deleteBoard: (id: string) => request<void>(`/api/boards/${id}`, { method: 'DELETE' }),

  saveSnapshot: (id: string, snapshot: unknown, thumbnail: string | null) =>
    request<{ updatedAt: number }>(`/api/boards/${id}/snapshot`, {
      method: 'PUT',
      body: JSON.stringify({ snapshot, thumbnail }),
    }),

  saveThumbnail: (id: string, thumbnail: string) =>
    request<void>(`/api/boards/${id}/thumbnail`, {
      method: 'PUT',
      body: JSON.stringify({ thumbnail }),
    }),

  restoreRevision: (id: string, revisionId: number) =>
    request<{ restored: number; appliedToRoom: boolean }>(`/api/boards/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ revisionId }),
    }),

  share: () => request<ShareInfo>('/api/share'),

  peers: (id: string) => request<{ peers: number; max: number }>(`/api/boards/${id}/peers`),

  listRevisions: (id: string) =>
    request<{ kept: number; revisions: Revision[] }>(`/api/boards/${id}/revisions`),

  getRevision: (id: string, revisionId: number) =>
    request<{ id: number; createdAt: number; snapshot: unknown }>(
      `/api/boards/${id}/revisions/${revisionId}`
    ),

  listTemplates: () => request<Template[]>('/api/templates'),

  exportBoard: (id: string, payload: { png?: string; svg?: string }) =>
    request<{ files: string[]; directory: string }>(`/api/boards/${id}/export`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  where: () => request<{ database: string; exports: string }>('/api/where'),
}

/**
 * A last-gasp save used when the tab is closing — `keepalive` lets the request
 * outlive the page, which a normal fetch would not. Browsers cap keepalive
 * bodies at 64KB, so this is a backstop only: the real protection is that we
 * also flush on `visibilitychange`, well before the page is torn down.
 */
export function saveSnapshotBeacon(id: string, snapshot: unknown, thumbnail: string | null) {
  try {
    void fetch(`/api/boards/${id}/snapshot`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot, thumbnail }),
      keepalive: true,
    })
  } catch {
    // Nothing useful to do while the page is being torn down.
  }
}
