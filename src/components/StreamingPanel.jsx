import React, { useRef, useEffect } from 'react'

export default function StreamingPanel({ text, streaming, label = 'Claude is thinking...' }) {
  const bottomRef = useRef()

  useEffect(() => {
    if (streaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [text, streaming])

  if (!text && !streaming) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-800/50">
        {streaming && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
        )}
        <span className="text-xs font-medium text-gray-400">{streaming ? label : 'Response complete'}</span>
      </div>
      <div className="p-4 max-h-80 overflow-y-auto">
        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
          {text}
          {streaming && <span className="animate-pulse text-sky-400">▋</span>}
        </pre>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
