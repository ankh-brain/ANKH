import { useEffect, useState } from 'react'
import { BoardPicker } from './components/BoardPicker'
import { BoardEditor } from './components/BoardEditor'

interface Route {
  boardId: string | null
  templateId?: string
}

function parseHash(): Route {
  // #/            → picker
  // #/b/<id>      → board
  // #/b/<id>?template=<template-id>
  const hash = window.location.hash.replace(/^#/, '')
  const match = /^\/b\/([^/?]+)(?:\?(.*))?$/.exec(hash)
  if (!match) return { boardId: null }

  const params = new URLSearchParams(match[2] ?? '')
  return { boardId: match[1], templateId: params.get('template') ?? undefined }
}

export function App() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (!route.boardId) return <BoardPicker />
  return <BoardEditor boardId={route.boardId} templateId={route.templateId} />
}
