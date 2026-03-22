import { useState, useCallback } from 'react'

export function useClaude() {
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)

  const call = useCallback(async (params) => {
    setStreaming(true)
    setError(null)
    try {
      const result = await window.api.llm.call(params)
      return result
    } catch (err) {
      setError(err.message || 'LLM API error')
      throw err
    } finally {
      setStreaming(false)
    }
  }, [])

  return { call, streaming, error }
}
