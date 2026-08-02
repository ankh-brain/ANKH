import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { BoardSummary, ShareInfo, Template } from '../types'

function formatUpdated(timestamp: number) {
  const date = new Date(timestamp)
  const sameDay = new Date().toDateString() === date.toDateString()
  return sameDay
    ? `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BoardPicker() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [where, setWhere] = useState<{ database: string; exports: string } | null>(null)
  const [share, setShare] = useState<ShareInfo | null>(null)

  const refresh = useCallback(async () => {
    try {
      setBoards(await api.listBoards())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the board server')
      setBoards([])
    }
  }, [])

  useEffect(() => {
    void refresh()
    api.listTemplates().then(setTemplates).catch(() => setTemplates([]))
    api.where().then(setWhere).catch(() => setWhere(null))
    api.share().then(setShare).catch(() => setShare(null))
  }, [refresh])

  const createBoard = useCallback(async () => {
    const trimmed = name.trim()
    try {
      const board = await api.createBoard(trimmed || 'Untitled board')
      const suffix = selectedTemplate ? `?template=${encodeURIComponent(selectedTemplate)}` : ''
      window.location.hash = `#/b/${board.id}${suffix}`
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the board')
    }
  }, [name, selectedTemplate])

  const removeBoard = useCallback(
    async (board: BoardSummary) => {
      const confirmed = window.confirm(
        `Delete "${board.name}"? Its snapshots and history go with it. This can't be undone.`
      )
      if (!confirmed) return
      await api.deleteBoard(board.id)
      void refresh()
    },
    [refresh]
  )

  const commitRename = useCallback(
    async (board: BoardSummary) => {
      const trimmed = renameValue.trim()
      setRenaming(null)
      if (!trimmed || trimmed === board.name) return
      await api.renameBoard(board.id, trimmed)
      void refresh()
    },
    [renameValue, refresh]
  )

  return (
    <div className="screen">
      <header className="screen__header">
        <div>
          <h1>Whiteboards</h1>
          <p className="muted">
            {boards === null
              ? 'Loading…'
              : `${boards.length} ${boards.length === 1 ? 'board' : 'boards'}, saved on this machine`}
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {share?.enabled && (
        <p className="share-banner">
          <strong>Sharing is on.</strong> One other person can join a board with you — send them{' '}
          <code>{share.url ?? 'this machine\u2019s address on your network'}</code>. Boards seat{' '}
          {share.maxPeers}.
        </p>
      )}

      <section className="new-board">
        <div className="new-board__row">
          <input
            className="input"
            placeholder="Name your board"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void createBoard()
            }}
          />
          <button className="button button--primary" onClick={() => void createBoard()}>
            Create board
          </button>
        </div>

        <div className="templates">
          <button
            className={`template ${selectedTemplate === null ? 'template--selected' : ''}`}
            onClick={() => setSelectedTemplate(null)}
          >
            <span className="template__name">Blank</span>
            <span className="template__description">An empty canvas.</span>
          </button>

          {templates.map((template) => (
            <button
              key={template.id}
              className={`template ${selectedTemplate === template.id ? 'template--selected' : ''}`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <span className="template__name">{template.name}</span>
              <span className="template__description">{template.description}</span>
            </button>
          ))}
        </div>
      </section>

      {boards !== null && boards.length === 0 && (
        <p className="muted empty">No boards yet. Name one above and start thinking.</p>
      )}

      <div className="board-grid">
        {boards?.map((board) => (
          <article key={board.id} className="board-card">
            <a className="board-card__thumb" href={`#/b/${board.id}`}>
              {board.thumbnail ? (
                <img src={board.thumbnail} alt="" loading="lazy" />
              ) : (
                <span className="board-card__thumb-empty">Empty board</span>
              )}
            </a>

            <div className="board-card__body">
              {renaming === board.id ? (
                <input
                  className="input input--inline"
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => void commitRename(board)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void commitRename(board)
                    if (event.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <a className="board-card__name" href={`#/b/${board.id}`}>
                  {board.name}
                </a>
              )}
              <p className="board-card__meta">{formatUpdated(board.updatedAt)}</p>
            </div>

            <div className="board-card__actions">
              <button
                className="button button--ghost"
                onClick={() => {
                  setRenaming(board.id)
                  setRenameValue(board.name)
                }}
              >
                Rename
              </button>
              <button
                className="button button--ghost button--danger"
                onClick={() => void removeBoard(board)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {where && (
        <footer className="screen__footer muted">
          Boards live in <code>{where.database}</code> · exports go to <code>{where.exports}</code>
        </footer>
      )}
    </div>
  )
}
