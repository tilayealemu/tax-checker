import React, { useState, useRef } from 'react'

export default function FileUpload({ sessionId, files = [], onFilesAdded, disabled }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dropRef = useRef()

  async function processFiles(filePaths) {
    if (!filePaths.length || !sessionId) return
    setUploading(true)
    try {
      const result = await window.api.files.copyToSession(sessionId, filePaths)
      if (result.success) {
        onFilesAdded(result.files)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handlePickFiles() {
    const paths = await window.api.files.openPicker()
    await processFiles(paths)
  }

  function onDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function onDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function onDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!dropRef.current?.contains(e.relatedTarget)) {
      setDragging(false)
    }
  }

  async function onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    // In Electron, File objects have a .path property with the absolute path
    const paths = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean)
    if (paths.length) {
      await processFiles(paths)
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${disabled ? 'opacity-40 cursor-not-allowed' :
            dragging ? 'border-sky-500 bg-sky-950/30' :
            'border-gray-700 hover:border-gray-600 cursor-pointer'}
        `}
        onClick={disabled ? undefined : handlePickFiles}
      >
        <div className="text-3xl mb-2">{uploading ? '⏳' : '📂'}</div>
        {uploading ? (
          <p className="text-gray-400">Copying files to session...</p>
        ) : (
          <>
            <p className="text-gray-300 font-medium">Drop files here or click to browse</p>
            <p className="text-gray-600 text-sm mt-1">PDF, images, CSV, TXT — any tax document format</p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
              <span className="text-sm">{fileIcon(f)}</span>
              <span className="text-sm text-gray-300 flex-1 truncate">{f}</span>
            </div>
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
  if (ext === 'json') return '📊'
  return '📎'
}
