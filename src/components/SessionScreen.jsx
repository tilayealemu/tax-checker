import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from '../hooks/useSessions'
import { useClaude } from '../hooks/useClaude'
import ExtractView from './ExtractView'
import AnalysisView from './AnalysisView'
import ChecksView from './ChecksView'
import ChatPanel from './ChatPanel'
import { filterChecks } from '../utils/filterChecks'

function extractBalanced(text, open, close) {
  const start = text.indexOf(open)
  if (start === -1) return null
  let depth = 0, inStr = false, escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inStr) { escape = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === open) depth++
    else if (c === close) { if (--depth === 0) return text.slice(start, i + 1) }
  }
  return null
}

function extractAllObjects(text) {
  const items = []
  let pos = 0
  while (pos < text.length) {
    const start = text.indexOf('{', pos)
    if (start === -1) break
    const chunk = extractBalanced(text.slice(start), '{', '}')
    if (!chunk) break
    try {
      items.push(JSON.parse(chunk))
      pos = start + chunk.length
    } catch {
      pos = start + 1
    }
  }
  return items
}

function parseJSON(text) {
  const candidates = [text.trim()]

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) candidates.unshift(fenceMatch[1].trim())

  for (const src of candidates) {
    try { return JSON.parse(src) } catch {}
    for (const [o, c] of [['[', ']'], ['{', '}']]) {
      const chunk = extractBalanced(src, o, c)
      if (chunk) { try { return JSON.parse(chunk) } catch {} }
    }
  }

  throw new Error('Could not parse JSON from LLM response')
}


export default function SessionScreen({ sessionId, onBack, saveSampleEnabled }) {
  const { session, loading, save } = useSession(sessionId)
  const { call, streaming } = useClaude()

  const [tab, setTab] = useState('overview')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('anthropic')
  const [analyzeMenuOpen, setAnalyzeMenuOpen] = useState(false)
  const [pendingProvider, setPendingProvider] = useState(null) // provider waiting for API key

  const [chatMessages, setChatMessages] = useState([])
  const msgIdRef = useRef(0)

  const [userFileCount, setUserFileCount] = useState(0)
  const [liveChecksResults, setLiveChecksResults] = useState(null)
  const [analysisCleared, setAnalysisCleared] = useState(false)

  async function refreshFileCount() {
    const count = await window.api.files.countSessionFiles(sessionId)
    setUserFileCount(count)
  }

  useEffect(() => { refreshFileCount() }, [session?.files?.length])

  function addMessage(msg) {
    const id = ++msgIdRef.current
    setChatMessages(prev => [...prev, { id, ...msg }])
    return id
  }

  function updateMessage(id, updates) {
    setChatMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Loading session…</div>
  }
  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Session not found. <button className="ml-2 text-sky-400 underline" onClick={onBack}>Go back</button>
      </div>
    )
  }

  async function handleFilesAdded(newFiles) {
    await save({
      files: [...(session.files || []), ...newFiles].filter((f, i, arr) => arr.indexOf(f) === i)
    })
  }

  async function runExtract(keyOverride, providerOverride) {
    const prov = providerOverride || provider
    const key = prov === 'mock' ? 'mock' : (keyOverride || apiKey)
    if (!key) return
    // Immediately wipe UI before async save
    setAnalysisCleared(true)
    setLiveChecksResults(null)
    await save({ extractedData: null, verificationResults: [], checksResults: null, analyzedWith: null, analyzedAt: null, fileMetadata: null, status: 'new' })
    const promptText = await window.api.files.readPrompt('extract')
    const logName = `extract-${Date.now()}`
    const msgId = addMessage({ role: 'op', op: 'extract', label: 'Analyze Return', prompt: promptText, logName, status: 'running', response: null })
    let result
    try {
      result = await call({
        provider: prov, apiKey: key, model: session.model, prompt: promptText,
        sessionId: session.id, logName, useSessionFiles: true
      })
      const parsed = parseJSON(result.text)
      const { verificationResults, ...extractedData } = parsed
      const updatedMetadata = { ...(session.fileMetadata || {}) }
      for (const cat of (extractedData.fileCategories || [])) {
        updatedMetadata[cat.filename] = {
          ...(updatedMetadata[cat.filename] || {}),
          formType: cat.formType,
          formCode: cat.formCode,
          formDescription: cat.description,
        }
      }
      await save({ extractedData, fileMetadata: updatedMetadata, verificationResults: verificationResults || [], status: 'extracted' })
      setAnalysisCleared(false)
      updateMessage(msgId, { status: 'done', response: result.text })
      await runChecks(key, prov, extractedData)
    } catch (err) {
      setAnalysisCleared(false)
      updateMessage(msgId, { status: 'error', errorMsg: err.message, response: result?.text })
    }
  }

  async function runChecks(keyOverride, providerOverride, extractedDataOverride) {
    const prov = providerOverride || provider
    const key = prov === 'mock' ? 'mock' : (keyOverride || apiKey)
    const data = extractedDataOverride || session.extractedData
    if (!key || !data) return
    const [promptTemplate, checksContent] = await Promise.all([
      window.api.files.readPrompt('checks'),
      window.api.files.readChecks()
    ])
    const filteredChecks = filterChecks(checksContent, data)
    const promptText = promptTemplate
      .replace('{{EXTRACTED_DATA}}', JSON.stringify(data, null, 2))
      .replace('{{CHECKS}}', filteredChecks)
    const logName = `checks-${Date.now()}`
    const msgId = addMessage({ role: 'op', op: 'checks', label: 'Run Checks', prompt: promptText, logName, status: 'running', response: null })

    let accumulated = ''
    const removeListener = window.api.llm.onChunk(({ text, logName: chunkLog }) => {
      if (chunkLog !== logName) return
      accumulated += text
      const items = extractAllObjects(accumulated)
      if (items.length > 0) setLiveChecksResults(items)
    })

    setTab('overview')
    let result
    try {
      result = await call({ provider: prov, apiKey: key, model: 'claude-sonnet-4-6', prompt: promptText, sessionId: session.id, logName })
      removeListener()
      const checks = parseJSON(result.text)
      const modelLabel = prov === 'mock' ? 'Mock LLM' : (session.model || 'claude-sonnet-4-6')
      await save({ checksResults: checks, status: session.status, analyzedWith: modelLabel, analyzedAt: new Date().toISOString() })
      updateMessage(msgId, { status: 'done', response: result.text })
    } catch (err) {
      removeListener()
      updateMessage(msgId, { status: 'error', errorMsg: err.message, response: result?.text })
    } finally {
      setLiveChecksResults(null)
    }
  }



  const baseChecksResults = analysisCleared ? [] : (liveChecksResults ?? (
    Array.isArray(session.checksResults)
      ? session.checksResults
      : session.checksResults ? Object.values(session.checksResults) : []
  ))
  const findings = analysisCleared ? [] : [
    ...(session.verificationResults || []),
    ...baseChecksResults
  ]
  const effectiveExtractedData = analysisCleared ? null : session.extractedData

  const nonVerifiedCount = findings.filter(f => f.status !== 'verified').length

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'info', label: 'Details', disabled: !effectiveExtractedData },
    { id: 'findings', label: nonVerifiedCount > 0 ? `Findings (${nonVerifiedCount})` : 'Findings', disabled: !findings.length },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button className="text-gray-700 hover:text-gray-900 text-base font-semibold transition-colors flex items-center gap-1" onClick={onBack}>
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{session.taxpayerName} · {session.taxYear}</h1>
          <p className="text-xs text-amber-600">Experimental · Not professional tax advice · Consult a qualified tax professional</p>
        </div>
      </header>

      {/* Action bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
        <button
          onClick={async () => {
            const paths = await window.api.files.openPicker()
            if (paths?.length) {
              const result = await window.api.files.copyToSession(session.id, paths)
              if (result.files?.length) handleFilesAdded(result.files)
              refreshFileCount()
            }
          }}
          className="btn-primary text-sm"
        >
          Browse Files{userFileCount > 0 ? ` (${userFileCount})` : ''}
        </button>
        <span className="text-gray-400 font-medium select-none">→</span>
        <AnalyzeMenu
          open={analyzeMenuOpen}
          onToggle={() => setAnalyzeMenuOpen(v => !v)}
          onClose={() => setAnalyzeMenuOpen(false)}
          disabled={!userFileCount || streaming}
          onSelectLLM={(prov) => {
            setProvider(prov)
            setAnalyzeMenuOpen(false)
            if (prov === 'mock') {
              runExtract('mock', 'mock')
            } else if (apiKey) {
              runExtract(apiKey, prov)
            } else {
              setPendingProvider(prov)
            }
          }}
        />
        {saveSampleEnabled && (
          <button
            onClick={() => window.api.files.saveSample(session)}
            disabled={!session.files?.length || !session.extractedData || !session.checksResults}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-gray-200"
            title="Save session data as sample for dry-run mode"
          >
            Save as sample
          </button>
        )}
      </div>

      {/* Inline API key prompt */}
      {pendingProvider && (
        <ApiKeyPrompt
          provider={pendingProvider}
          onSubmit={(key) => {
            setApiKey(key)
            setPendingProvider(null)
            runExtract(key, pendingProvider)
          }}
          onCancel={() => setPendingProvider(null)}
        />
      )}

      {/* Tabs */}
      <div className="flex items-end gap-1 border-b border-gray-200 px-6 bg-gray-50 flex-shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            className={`px-5 py-2.5 text-lg font-semibold rounded-t transition-colors -mb-px border ${
              t.disabled
                ? 'text-gray-300 cursor-not-allowed border-transparent bg-transparent'
                : tab === t.id
                ? 'text-sky-600 bg-white border-gray-200 border-b-white'
                : 'text-gray-500 bg-gray-100 border-gray-200 hover:bg-gray-200 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">
          {tab === 'overview' && (
            <OverviewTab session={session} extractedData={effectiveExtractedData} />
          )}

          {tab === 'info' && (
            <DetailsTab session={session} extractedData={effectiveExtractedData} />
          )}

          {tab === 'findings' && (
            <ChecksView checksResults={findings} />
          )}

        </main>
      </div>

      {/* Chat panel */}
      <ChatPanel
        session={session}
        apiKey={apiKey}
        onSetApiKey={setApiKey}
        provider={provider}
        messages={chatMessages}
        addMessage={addMessage}
        updateMessage={updateMessage}
        onFilesAdded={handleFilesAdded}
        onStartAnalyzing={runExtract}
      />
    </div>
  )
}

const PROVIDER_LABELS = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI (Codex)',
  gemini: 'Google Gemini',
}

function ApiKeyPrompt({ provider, onSubmit, onCancel }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  function handleSubmit(e) {
    e?.preventDefault()
    const key = value.trim()
    if (!key) return
    onSubmit(key)
  }

  const placeholder = provider === 'openai' ? 'sk-…' : provider === 'gemini' ? 'AIza…' : 'sk-ant-…'

  return (
    <div className="px-6 py-3 bg-sky-50 border-b border-sky-100 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
          {PROVIDER_LABELS[provider] || provider} API key
        </span>
        <input
          ref={inputRef}
          className="flex-1 min-w-48 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder-gray-400"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" disabled={!value.trim()} className="btn-primary text-sm">
          Run →
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </form>
    </div>
  )
}

const ANALYZE_OPTIONS = [
  { id: 'mock',      label: 'Mock LLM', description: 'Streams sample data — no API key' },
  { id: 'anthropic', label: 'Claude',   description: 'Anthropic model, integration tested' },
  { id: 'gemini',    label: 'Gemini',   description: 'Gemini model, integration untested' },
  { id: 'openai',    label: 'Codex',    description: 'Open AI model, integration untested' },
]

function AnalyzeMenu({ open, onToggle, onClose, disabled, onSelectLLM }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        disabled={disabled}
        className="btn-primary text-sm flex items-center gap-1.5"
      >
        Analyze
        <span className="text-[10px] opacity-70">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {ANALYZE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSelectLLM(opt.id)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼️'
  if (['csv', 'txt'].includes(ext)) return '📋'
  return '📎'
}

function fmt(val) {
  if (!val && val !== 0) return '—'
  if (typeof val === 'number') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
  return String(val)
}

function DetailsTab({ session, extractedData }) {
  const d = extractedData
  if (!d) return null

  const fileCategories = d.fileCategories || []
  const fileSummaries = d.fileSummaries || []
  const summaryByFilename = Object.fromEntries(fileSummaries.map(s => [s.filename, s.summary]))

  if (!fileCategories.length) {
    return (
      <div className="card text-center py-8 text-sm text-gray-400">No file details available.</div>
    )
  }

  return (
    <div className="space-y-3">
      {fileCategories.map((f, i) => {
        const label = f.formType === 'IRS'
          ? [f.formType, f.formCode].filter(Boolean).join(' ')
          : [f.formType, f.description].filter(Boolean).join(': ')
        const summary = summaryByFilename[f.filename]
        return (
          <div key={i} className="card p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold text-gray-900">{f.filename}</span>
              <span className="text-xs text-gray-400 shrink-0">{label || '—'}</span>
            </div>
            {summary
              ? <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
              : <p className="text-sm text-gray-400 italic">Summary not available — re-run Analyze to generate.</p>
            }
          </div>
        )
      })}
    </div>
  )
}

function OverviewTab({ session, extractedData }) {
  const d = extractedData

  return (
    <div className="space-y-4">
      {d ? (
        <ExtractView data={d} files={session.files} fileMetadata={session.fileMetadata} />
      ) : (
        <div className="card border-dashed border-gray-200 text-center py-8">
          <p className="text-gray-400 text-sm">Browse and load your tax documents to get started.</p>
        </div>
      )}
    </div>
  )
}
