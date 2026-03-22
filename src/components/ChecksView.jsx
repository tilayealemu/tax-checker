import { useState } from 'react'

const FILTERS = [
  { id: 'discrepancy',          label: 'Discrepancy' },
  { id: 'possible_overpayment', label: 'Possible Overpayment' },
  { id: 'possible_underpayment',label: 'Possible Underpayment' },
  { id: 'needs_more_info',      label: 'Needs More Info' },
  { id: 'verified',             label: 'Verified' },
  { id: 'all',                  label: 'All' },
]

const STATUS_ORDER = {
  discrepancy: 0,
  possible_overpayment: 1,
  possible_underpayment: 2,
  needs_more_info: 3,
  verified: 4,
}

const STATUS_STYLES = {
  verified:             { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800',  label: 'Verified' },
  discrepancy:          { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-800',      label: 'Discrepancy' },
  possible_overpayment: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800',label: 'Possible Overpayment' },
  possible_underpayment:{ dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-900',label: 'Possible Underpayment' },
  needs_more_info:      { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-800',    label: 'Needs More Info' },
}

const FALLBACK = { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-800', label: 'Unknown' }

function normalizeChecks(raw) {
  if (!raw) return []
  return (Array.isArray(raw) ? raw : Object.values(raw))
    .slice()
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
}

function groupByCategory(checks) {
  const groups = []
  const seen = {}
  for (const c of checks) {
    const cat = c.category || 'Other'
    if (!seen[cat]) {
      seen[cat] = { category: cat, items: [] }
      groups.push(seen[cat])
    }
    seen[cat].items.push(c)
  }
  return groups
}

function CheckCard({ check }) {
  const style = STATUS_STYLES[check.status] || FALLBACK
  const hasAmount = check.possible_amount > 0 &&
    (check.status === 'possible_overpayment' || check.status === 'possible_underpayment')
  const badgeLabel = hasAmount ? `${fmt(check.possible_amount)} ${style.label}` : style.label
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
              {badgeLabel}
            </span>
            <span className="text-sm text-gray-900">{check.category}</span>
          </div>
          <p className="text-sm font-medium text-gray-900">{check.text}</p>
          {check.detail && (
            <p className="text-sm text-gray-700 mt-1">{check.detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function SummaryBanner({ checks, type }) {
  const items = checks.filter(c => c.status === type && c.possible_amount > 0)
  if (!items.length) return null
  const total = items.reduce((sum, c) => sum + (c.possible_amount || 0), 0)
  const label = type === 'possible_overpayment' ? 'overpayment' : 'underpayment'
  const issues = items.map(c => c.text).join(', ')
  const truncated = issues.length > 200 ? issues.slice(0, 197) + '…' : issues
  const color = type === 'possible_overpayment' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-yellow-50 border-yellow-200 text-yellow-900'
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${color}`}>
      <span className="font-semibold">Possible {label} of {fmt(total)}</span>
      {truncated && <span className="ml-1">due to {truncated}</span>}
    </div>
  )
}

export default function ChecksView({ checksResults }) {
  const [filter, setFilter] = useState('discrepancy')

  const checks = normalizeChecks(checksResults)

  const counts = checks.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  const amountTotals = {
    possible_overpayment: checks.filter(c => c.status === 'possible_overpayment' && c.possible_amount > 0).reduce((s, c) => s + c.possible_amount, 0),
    possible_underpayment: checks.filter(c => c.status === 'possible_underpayment' && c.possible_amount > 0).reduce((s, c) => s + c.possible_amount, 0),
  }

  const filtered = filter === 'all' ? checks : checks.filter(c => c.status === filter)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const count = f.id === 'all' ? checks.length : counts[f.id]
          const amtTotal = amountTotals[f.id]
          const labelPrefix = amtTotal > 0 ? `${fmt(amtTotal)} ` : ''
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {labelPrefix}{f.label}
              {count > 0 && (
                <span className={`ml-1.5 ${filter === f.id ? 'opacity-75' : 'opacity-60'}`}>
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Summary banners for over/underpayment views */}
      {(filter === 'possible_overpayment' || filter === 'possible_underpayment') && (
        <SummaryBanner checks={checks} type={filter} />
      )}

      {/* Empty state */}
      {checks.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-sm text-gray-900">No results yet.</p>
          <p className="text-sm text-gray-700 mt-1">Run Load and Check to see findings here.</p>
        </div>
      )}

      {filtered.length === 0 && checks.length > 0 && (
        <div className="card text-center py-8 text-sm text-gray-900">
          No findings with this status.
        </div>
      )}

      {/* Grouped view for All, flat view otherwise */}
      {filter === 'all' && filtered.length > 0 && (
        <div className="space-y-6">
          {groupByCategory(filtered).map(group => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2 px-1">
                {group.category}
              </h3>
              <div className="space-y-3">
                {group.items.map((check, i) => <CheckCard key={i} check={check} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {filter !== 'all' && (
        <div className="space-y-3">
          {filtered.map((check, i) => <CheckCard key={i} check={check} />)}
        </div>
      )}
    </div>
  )
}
