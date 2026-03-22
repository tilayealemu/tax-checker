import React, { useState } from 'react'
import { DEFAULT_MODEL } from '../config'

const CURRENT_YEAR = new Date().getFullYear()
const MAX_YEAR = Math.max(2030, CURRENT_YEAR - 1)
const MIN_YEAR = Math.min(2015, CURRENT_YEAR - 10)
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i)

export default function NewSessionModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    taxpayerName: '',
    taxYear: String(CURRENT_YEAR - 1),
    model: DEFAULT_MODEL
  })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.taxpayerName.trim()) { setError('Taxpayer name is required'); return }

    setCreating(true)
    try {
      await onCreate(form)
    } catch (err) {
      setError(err.message || 'Failed to create session')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Tax Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Taxpayer Name</label>
            <input
              className="input"
              placeholder="e.g. John Smith"
              value={form.taxpayerName}
              onChange={e => set('taxpayerName', e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Tax Year</label>
            <select className="select" value={form.taxYear} onChange={e => set('taxYear', e.target.value)}>
              {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={creating}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
