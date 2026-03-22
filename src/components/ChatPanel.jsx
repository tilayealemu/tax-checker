import React, { useState, useRef, useEffect, useCallback } from 'react'

const MIN_HEIGHT = 180
const DEFAULT_HEIGHT = 170
const MAX_HEIGHT = 720

const PROVIDER_NAMES = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI (Codex)',
  gemini: 'Google Gemini',
  mock: 'Mock LLM'
}

export default function ChatPanel({
  session, apiKey, onSetApiKey, provider,
  messages, addMessage, updateMessage,
  onFilesAdded, onStartAnalyzing
}) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [isOpen, setIsOpen] = useState(true)
  const [input, setInput] = useState('')
  const [chatStreaming, setChatStreaming] = useState(false)
  const [chatError, setChatError] = useState('')
  const [liveChunks, setLiveChunks] = useState({})

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const apiKeyInputRef = useRef(null)
  const dragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  const isMock = provider === 'mock'

  useEffect(() => {
    const cleanup = window.api.llm.onChunk(({ text, logName }) => {
      setLiveChunks(prev => ({ ...prev, [logName]: (prev[logName] || '') + text }))
    })
    return cleanup
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveChunks, showApiKeyForm])

  useEffect(() => {
    if (showApiKeyForm) {
      setTimeout(() => apiKeyInputRef.current?.focus(), 50)
    }
  }, [showApiKeyForm])


  const onHandleMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = height
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }, [height])

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      const delta = dragStartY.current - e.clientY
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta)))
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function handleApiKeySubmit(e) {
    e?.preventDefault()
    const key = apiKeyInput.trim()
    if (!key) return
    onSetApiKey(key)
    setApiKeyInput('')
    setShowApiKeyForm(false)
  }

  function buildSystemPrompt() {
    const parts = [
      `You are a tax expert. You are reviewing the tax return for ${session.taxpayerName} (tax year ${session.taxYear}). Be concise and cite dollar amounts where relevant.`
    ]
    if (session.extractedData) parts.push(`\nExtracted return data:\n${JSON.stringify(session.extractedData, null, 2)}`)
    if (session.analysisResults?.length) parts.push(`\nFindings:\n${JSON.stringify(session.analysisResults, null, 2)}`)
    return parts.join('\n')
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || chatStreaming) return
    if (!isMock && !apiKey) {
      setShowApiKeyForm(true)
      
      return
    }
    setChatError('')
    setInput('')
    setChatStreaming(true)

    const logName = `chat-${Date.now()}`
    addMessage({ role: 'user', content: text })

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: text })

    try {
      const result = await window.api.llm.call({
        provider: isMock ? 'mock' : provider,
        apiKey: isMock ? 'mock' : apiKey,
        model: session.model,
        messages: history,
        systemPrompt: buildSystemPrompt(),
        sessionId: session.id, logName
      })
      addMessage({ role: 'assistant', content: result.text, logName })
    } catch (err) {
      setChatError(err.message || 'Chat failed')
    } finally {
      setChatStreaming(false)
      setLiveChunks(prev => { const n = { ...prev }; delete n[logName]; return n })
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const chatLogName = chatStreaming ? Object.keys(liveChunks).find(k => k.startsWith('chat-')) : null
  const panelHeight = isOpen ? height : 40
  const isEmpty = messages.length === 0

  return (
    <div
      className="flex-shrink-0 border-t border-gray-200 bg-gray-50 flex flex-col"
      style={{ height: panelHeight }}
    >
      {/* Header / drag handle */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0 group select-none"
        style={{ height: 40, cursor: isOpen ? 'ns-resize' : 'default' }}
        onMouseDown={isOpen ? onHandleMouseDown : undefined}
      >
        <div className="flex items-center gap-3 pointer-events-none">
          {isOpen && (
            <div className="flex flex-col gap-[3px] opacity-20 group-hover:opacity-50 transition-opacity">
              <div className="w-5 h-px bg-gray-500 rounded-full" />
              <div className="w-5 h-px bg-gray-500 rounded-full" />
              <div className="w-5 h-px bg-gray-500 rounded-full" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={() => setIsOpen(v => !v)}
            className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center transition-colors"
          >
            <span className="text-[10px]">{isOpen ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            {showApiKeyForm ? (
              <div className="h-full flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-sm bg-gray-100 border border-gray-300 rounded-xl p-5 space-y-3">
                  <p className="text-sm text-gray-700 font-medium">
                    Enter your API key to continue
                  </p>
                  <p className="text-xs text-gray-500">Provider: <span className="font-medium">{PROVIDER_NAMES[provider] || provider}</span></p>

                  {isMock ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400">Mock mode streams pre-canned sample data — no API key required.</p>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary text-sm px-4 flex-1"
                          onClick={() => { setShowApiKeyForm(false) }}
                        >
                          Continue →
                        </button>
                      </div>
                      <button
                        className="text-xs text-gray-400 hover:text-gray-600"
                        onClick={() => { setShowApiKeyForm(false) }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400">Your API key. Used only for this session. Never saved to disk.</p>
                      <form onSubmit={handleApiKeySubmit} className="flex gap-2">
                        <input
                          ref={apiKeyInputRef}
                          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder-gray-400"
                          placeholder={provider === 'anthropic' ? 'sk-ant-…' : provider === 'openai' ? 'sk-…' : 'AIza…'}
                          value={apiKeyInput}
                          onChange={e => setApiKeyInput(e.target.value)}
                          spellCheck={false}
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          className="btn-primary text-sm px-4"
                          disabled={!apiKeyInput.trim()}
                        >
                          Continue →
                        </button>
                      </form>
                      <button
                        className="text-xs text-gray-400 hover:text-gray-600"
                        onClick={() => { setShowApiKeyForm(false) }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : isEmpty ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-gray-300">Ask anything about this return…</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-3">
                {messages.map(msg => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    liveText={msg.status === 'running' ? (liveChunks[msg.logName] || '') : ''}
                    onRetry={msg.role === 'op' && msg.status === 'error' ? {
                      extract: () => onStartAnalyzing(apiKey, provider),
                      checks: () => onStartAnalyzing(apiKey, provider),
                    }[msg.op] : null}
                  />
                ))}

                {chatStreaming && chatLogName && (
                  <div className="flex gap-2.5">
                    <Avatar role="assistant" />
                    <div className="flex-1 min-w-0 bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2">
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                        {liveChunks[chatLogName] || <span className="text-gray-400 italic">thinking…</span>}
                        <span className="animate-pulse text-sky-600">▋</span>
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {chatError && (
            <div className="mx-4 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex-shrink-0">
              {chatError}
            </div>
          )}

          <div className="px-4 pb-3 pt-2 flex-shrink-0 border-t border-gray-100">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-600 resize-none leading-relaxed"
                placeholder="Ask anything about this return…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ maxHeight: 80, overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                disabled={chatStreaming}
              />
              <button
                className="btn-primary text-sm px-3 py-2 flex-shrink-0 self-end"
                onClick={sendMessage}
                disabled={chatStreaming || !input.trim()}
              >
                {chatStreaming
                  ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                  : '↑'}
              </button>
            </div>
            <p className="text-[11px] text-gray-300 mt-1">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ role }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold ${
      role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-sky-100 text-sky-600'
    }`}>
      {role === 'user' ? 'Y' : 'C'}
    </div>
  )
}

function MessageItem({ message, liveText, onRetry }) {
  const [promptOpen, setPromptOpen] = useState(false)

  if (message.role === 'user') {
    return (
      <div className="flex gap-2.5 flex-row-reverse">
        <Avatar role="user" />
        <div className="flex-1 min-w-0 flex justify-end">
          <div className={`inline-block rounded-xl rounded-tr-sm px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words max-w-[85%] ${
            message.error ? 'bg-red-50 text-red-600' : 'bg-sky-100 text-gray-900'
          }`}>
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  if (message.role === 'assistant') {
    return (
      <div className="flex gap-2.5">
        <Avatar role="assistant" />
        <div className="flex-1 min-w-0 bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2">
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  if (message.role === 'op') {
    const isRunning = message.status === 'running'
    const isError = message.status === 'error'
    const icons = { extract: '🔍', checks: '✅' }

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
        <div className={`flex items-center justify-between px-3 py-2 ${isRunning ? 'bg-gray-100' : isError ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2">
            <span>{icons[message.op] || '⚙️'}</span>
            <span className="font-semibold text-gray-600">{message.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-sky-600">
                <span className="w-2.5 h-2.5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                Running…
              </span>
            )}
            {!isRunning && !isError && <span className="text-green-600">✓ Done</span>}
            {isError && (
              <div className="flex items-center gap-2">
                <span className="text-red-600">✗ Error</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-xs text-sky-600 hover:text-sky-800 border border-sky-300 px-2 py-0.5 rounded transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {message.op !== 'code_checks' && (
          <div className="border-t border-gray-200">
            <button
              className="w-full flex items-center justify-between px-3 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setPromptOpen(v => !v)}
            >
              <span className="font-medium">Prompt sent to LLM</span>
              <span className="text-[10px]">{promptOpen ? '▲' : '▼'}</span>
            </button>
            {promptOpen && (
              <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                <pre className="text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">{message.prompt}</pre>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200">
          <div className="px-3 py-1.5 text-gray-400 font-medium flex items-center justify-between">
            <span>Response</span>
            {isRunning && !liveText && <span className="text-gray-300 italic font-normal">waiting…</span>}
          </div>
          {isError && (
            <p className="px-3 pt-2 pb-1 text-red-600 font-medium">{message.errorMsg || 'Operation failed'}</p>
          )}
          {(isRunning ? liveText : message.response) ? (
            <div className="px-3 pb-3 max-h-64 overflow-y-auto">
              <pre className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">
                {isRunning ? liveText : message.response}
                {isRunning && <span className="animate-pulse text-sky-600">▋</span>}
              </pre>
            </div>
          ) : !isError ? null : null}
        </div>
      </div>
    )
  }

  return null
}
