import React, { useState } from 'react'

const SEVERITY_STYLES = {
  high: {
    badge: 'bg-red-900/50 text-red-300 border-red-800',
    bar: 'bg-red-500',
    border: 'border-l-red-500'
  },
  medium: {
    badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
    bar: 'bg-yellow-500',
    border: 'border-l-yellow-500'
  },
  low: {
    badge: 'bg-blue-900/50 text-blue-300 border-blue-800',
    bar: 'bg-blue-500',
    border: 'border-l-blue-500'
  }
}

const CATEGORY_ICONS = {
  deduction: '📉',
  credit: '💳',
  error: '⚠️',
  income: '💰',
  planning: '📅',
  retirement: '🏦',
  investment: '📈',
  other: '💡'
}

export default function AnalysisView({ items = [] }) {
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(new Set())

  if (!items.length) return null

  const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))]
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)

  const counts = { high: 0, medium: 0, low: 0 }
  items.forEach(i => { if (counts[i.severity] !== undefined) counts[i.severity]++ })

  function toggle(idx) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        {['high', 'medium', 'low'].map(sev => (
          <div key={sev} className={`card border-l-4 ${SEVERITY_STYLES[sev].border}`}>
            <div className="text-2xl font-bold text-white">{counts[sev]}</div>
            <div className="text-xs text-gray-500 capitalize">{sev} priority</div>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
              filter === cat
                ? 'bg-sky-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat === 'all' ? `All (${items.length})` : `${CATEGORY_ICONS[cat] || '•'} ${cat}`}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item, idx) => {
          const style = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.low
          const isOpen = expanded.has(idx)
          return (
            <div
              key={idx}
              className={`card border-l-4 ${style.border} cursor-pointer hover:bg-gray-800/50 transition-colors`}
              onClick={() => toggle(idx)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base flex-shrink-0">{CATEGORY_ICONS[item.category] || '💡'}</span>
                  <span className="font-medium text-gray-100 text-sm">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.potentialSavings && (
                    <span className="text-xs text-green-400 font-medium">{item.potentialSavings}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${style.badge}`}>
                    {item.severity}
                  </span>
                  <span className="text-gray-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
                  <p className="text-sm text-gray-300 leading-relaxed">{item.explanation}</p>
                  {item.actionRequired && (
                    <div className="bg-sky-950/40 border border-sky-900 rounded-lg p-2.5">
                      <p className="text-xs font-semibold text-sky-400 mb-1">Action Required</p>
                      <p className="text-sm text-sky-200">{item.actionRequired}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
