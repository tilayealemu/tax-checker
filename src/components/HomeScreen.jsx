import React, { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import NewSessionModal from './NewSessionModal'

export default function HomeScreen({ onOpenSession }) {
  const { sessions, loading, deleteSession, clearAnalysis, createSession } = useSessions()
  const [showNew, setShowNew] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function handleDelete(id) {
    await deleteSession(id)
    setDeleteConfirm(null)
  }

  async function handleClearAnalysis(id) {
    await clearAnalysis(id)
    setDeleteConfirm(null)
  }

  async function handleCreate(formData) {
    const session = await createSession(formData)
    setShowNew(false)
    onOpenSession(session.id)
  }


  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-gray-200 bg-gray-50 app-drag">
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Tax Checker</h1>
        </div>
        <div className="flex-1 flex justify-end">
        <div className="flex items-center gap-2 app-no-drag">
          <button className="btn-primary text-sm" onClick={() => setShowNew(true)}>
            + New Session
          </button>
        </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 text-center">
        Experimental software. Not professional tax advice. Consult a qualified tax professional before making any tax decisions.
      </div>

      {/* Body */}
      <main className="flex-1 overflow-y-auto p-6 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="text-5xl">📄</div>
            <p className="text-gray-500 text-lg">No tax sessions yet</p>
            <p className="text-gray-400 text-sm max-w-xs">Create a new session to start analyzing tax returns</p>
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              Create First Session
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-5xl mx-auto">
            {sessions.sort((a, b) => {
              const n = (a.taxpayerName || '').localeCompare(b.taxpayerName || '')
              return n !== 0 ? n : (b.taxYear || 0) - (a.taxYear || 0)
            }).map(session => {
              const filingStatus = session.extractedData?.filingStatus
              const fileCount = session.files?.length || 0
              const toArray = r => Array.isArray(r) ? r : r ? Object.values(r) : []
              const allFindings = [...toArray(session.verificationResults), ...toArray(session.checksResults)]
              const analyzed = allFindings.length > 0
              const issueCount = allFindings.filter(c =>
                c.status === 'discrepancy' || c.status === 'possible_overpayment' || c.status === 'possible_underpayment'
              ).length
              const reviewCount = allFindings.filter(c => c.status === 'needs_more_info').length
              const verifiedCount = allFindings.filter(c => c.status === 'verified').length
              const analyzedAt = session.analyzedAt
                ? new Date(session.analyzedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                : null
              return (
                <div
                  key={session.id}
                  className="card cursor-pointer transition-all hover:shadow-md hover:border-sky-200"
                  onClick={() => onOpenSession(session.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 grid grid-cols-3 items-center gap-6 min-w-0">
                      {/* Left: name + filing status + tax year */}
                      <div className="min-w-0">
                        <div className="text-3xl font-bold text-gray-900 truncate">{session.taxpayerName || 'Unknown'}</div>
                        <div className="text-sm text-gray-900 mt-1">
                          {[filingStatus, session.taxYear ? `Tax Year ${session.taxYear}` : null].filter(Boolean).join(', ') || '—'}
                        </div>
                      </div>
                      {/* Middle: last analyzed date + file count + model */}
                      <div className="text-center space-y-1">
                        {analyzedAt ? (
                          <div className="text-sm text-gray-700">{analyzedAt}</div>
                        ) : (
                          <div className="text-sm text-gray-900">Not analyzed</div>
                        )}
                        <div className="text-sm text-gray-500">
                          {fileCount} {fileCount === 1 ? 'file' : 'files'}
                          {session.analyzedWith ? ` analyzed by ${session.analyzedWith}` : ''}
                        </div>
                      </div>
                      {/* Right: issues / to review / verified */}
                      <div className="text-right space-y-1">
                        {analyzed ? (
                          <>
                            <div className={`text-sm font-semibold ${issueCount > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                              {issueCount} issue{issueCount !== 1 ? 's' : ''}
                            </div>
                            <div className={`text-sm font-semibold ${reviewCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                              {reviewCount} to review
                            </div>
                            <div className={`text-sm font-semibold ${verifiedCount > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                              {verifiedCount} verified
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-900">Not analyzed</div>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded text-xl flex-shrink-0"
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(session.id) }}
                      title="Delete session"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* New Session Modal */}
      {showNew && (
        <NewSessionModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (() => {
        const isProtected = deleteConfirm === 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="card max-w-sm w-full space-y-4">
              <h3 className="text-lg font-semibold">Remove Data?</h3>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-medium text-gray-900">Clear Analysis</div>
                  <div className="text-xs text-gray-500">Removes analysis results and returns the session to "not yet analyzed". Input files are kept.</div>
                  <button className="btn-secondary text-sm mt-2 w-full" onClick={() => handleClearAnalysis(deleteConfirm)}>Clear Analysis</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-medium text-gray-900">Delete Filing</div>
                  <div className="text-xs text-gray-500">Permanently deletes the session and all its files. This cannot be undone.</div>
                  <button
                    className="btn-danger text-sm mt-2 w-full disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isProtected}
                    onClick={() => !isProtected && handleDelete(deleteConfirm)}
                  >
                    Delete Filing
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="btn-secondary text-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
