import { useState, useEffect, useCallback } from 'react'

export function useSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.sessions.list()
      setSessions(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function createSession(data) {
    const { v4: uuidv4 } = await import('uuid')
    const session = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      files: [],
      extractedData: null,
      analysisResults: null,
      status: 'new'
    }
    await window.api.sessions.save(session.id, session)
    await refresh()
    return session
  }

  async function saveSession(id, updates) {
    const existing = await window.api.sessions.get(id)
    const updated = { ...existing, ...updates }
    await window.api.sessions.save(id, updated)
    await refresh()
    return updated
  }

  async function deleteSession(id) {
    await window.api.sessions.delete(id)
    await refresh()
  }

  async function clearAnalysis(id) {
    const existing = await window.api.sessions.get(id)
    const updated = { ...existing, extractedData: null, checksResults: null, verificationResults: [], analyzedWith: null, analyzedAt: null, fileMetadata: null, status: 'new' }
    await window.api.sessions.save(id, updated)
    await refresh()
  }

  return { sessions, loading, refresh, createSession, saveSession, deleteSession, clearAnalysis }
}

export function useSession(sessionId) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const data = await window.api.sessions.get(sessionId)
      setSession(data)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { refresh() }, [refresh])

  async function save(updates) {
    // Re-fetch latest from disk to avoid stale closure overwriting concurrent updates
    const latest = await window.api.sessions.get(sessionId)
    const updated = { ...(latest || session), ...updates }
    await window.api.sessions.save(sessionId, updated)
    setSession(updated)
    return updated
  }

  return { session, loading, refresh, save }
}
