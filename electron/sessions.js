import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export const SESSIONS_DIR = path.join(app.getAppPath(), 'sessions')

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function listSessionDirs() {
  ensureDir(SESSIONS_DIR)
  return fs.readdirSync(SESSIONS_DIR).filter(d =>
    fs.statSync(path.join(SESSIONS_DIR, d)).isDirectory()
  )
}

function getSessionDir(sessionId) {
  const dirs = listSessionDirs()
  const match = dirs.find(d => {
    const sessionFile = path.join(SESSIONS_DIR, d, 'session.json')
    if (!fs.existsSync(sessionFile)) return false
    try {
      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'))
      return data.id === sessionId
    } catch {
      return false
    }
  })
  return match ? path.join(SESSIONS_DIR, match) : null
}

export { getSessionDir }

export function list() {
  const dirs = listSessionDirs()
  const sessions = []
  for (const dir of dirs) {
    const sessionFile = path.join(SESSIONS_DIR, dir, 'session.json')
    if (fs.existsSync(sessionFile)) {
      try {
        sessions.push(JSON.parse(fs.readFileSync(sessionFile, 'utf8')))
      } catch { /* skip corrupt */ }
    }
  }
  return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function get(sessionId) {
  const dir = getSessionDir(sessionId)
  if (!dir) return null
  const sessionFile = path.join(dir, 'session.json')
  if (!fs.existsSync(sessionFile)) return null
  return JSON.parse(fs.readFileSync(sessionFile, 'utf8'))
}

export function save(sessionId, data) {
  let dir = getSessionDir(sessionId)
  if (!dir) {
    const safeName = (data.taxpayerName || 'unknown')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
    const dirName = `${safeName}-${data.taxYear || 'unknown'}-${Date.now()}`
    dir = path.join(SESSIONS_DIR, dirName)
    ensureDir(dir)
    ensureDir(path.join(dir, 'input'))
  }
  fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), 'utf8')
  return { success: true, dir }
}

export function deleteSession(sessionId) {
  const dir = getSessionDir(sessionId)
  if (!dir) return { success: false, error: 'Session not found' }
  fs.rmSync(dir, { recursive: true, force: true })
  return { success: true }
}

export function copyFilesToSession(sessionId, filePaths) {
  const dir = getSessionDir(sessionId)
  if (!dir) return { success: false, error: 'Session not found' }
  const inputDir = path.join(dir, 'input')
  ensureDir(inputDir)
  const validPaths = (filePaths || []).filter(Boolean)
  if (!validPaths.length) return { success: true, files: [] }
  const copied = []
  for (const filePath of validPaths) {
    const fileName = path.basename(filePath)
    fs.copyFileSync(filePath, path.join(inputDir, fileName))
    copied.push(fileName)
  }
  return { success: true, files: copied }
}

export function saveClaudeLog(sessionId, logName, data) {
  const dir = getSessionDir(sessionId)
  if (!dir) return { success: false, error: 'Session not found' }
  const logsDir = path.join(dir, 'claude-logs')
  ensureDir(logsDir)
  const logFile = path.join(logsDir, `${logName}-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify(data, null, 2), 'utf8')
  return { success: true, file: logFile }
}

export function readSessionFiles(sessionId) {
  const dir = getSessionDir(sessionId)
  if (!dir) return []
  const inputDir = path.join(dir, 'input')
  if (!fs.existsSync(inputDir)) return []
  return fs.readdirSync(inputDir)
    .filter(f => !f.startsWith('.'))
    .map(f => path.join(inputDir, f))
}
