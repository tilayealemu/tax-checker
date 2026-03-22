import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import * as sessions from './sessions.js'
import { processFiles } from './fileProcessor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.env.DRY_RUN === 'true'
const SAMPLE_PATH = path.join(app.getAppPath(), 'sample.json')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  })

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173/')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus() })
  if (!app.isPackaged) mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Config IPC ────────────────────────────────────────────────────────────────
ipcMain.handle('config:saveSampleEnabled', () => process.env.SAVE_SAMPLE === 'true')

// ── Sessions IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('sessions:list', () => sessions.list())
ipcMain.handle('sessions:get', (_e, id) => sessions.get(id))
ipcMain.handle('sessions:save', (_e, id, data) => sessions.save(id, data))
ipcMain.handle('sessions:delete', (_e, id) => sessions.deleteSession(id))

// ── File IPC ──────────────────────────────────────────────────────────────────
ipcMain.handle('files:copyToSession', async (_e, sessionId, filePaths) => {
  const result = sessions.copyFilesToSession(sessionId, filePaths)
  if (result.success && result.files?.length) {
    const sessionDir = sessions.getSessionDir(sessionId)
    if (sessionDir) {
      const inputDir = path.join(sessionDir, 'input')
      const outputDir = path.join(sessionDir, 'output')
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
      const copiedPaths = result.files.map(f => path.join(inputDir, f))
      processFiles(copiedPaths, outputDir).catch(() => {})
    }
  }
  return result
})

ipcMain.handle('files:countSessionFiles', (_e, sessionId) => {
  const sessionDir = sessions.getSessionDir(sessionId)
  if (!sessionDir) return 0
  const inputDir = path.join(sessionDir, 'input')
  if (!fs.existsSync(inputDir)) return 0
  return fs.readdirSync(inputDir).filter(f => !f.startsWith('.')).length
})

ipcMain.handle('files:openPicker', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'Documents', extensions: ['txt', 'csv', 'json'] }
    ]
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('files:readPrompt', (_e, name) => {
  const promptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'prompts', `${name}.md`)
    : path.join(__dirname, '..', '..', 'prompts', `${name}.md`)
  if (!fs.existsSync(promptPath)) throw new Error(`Prompt not found: ${name}.md`)
  return fs.readFileSync(promptPath, 'utf8')
})

ipcMain.handle('files:readChecks', () => {
  const checksPath = app.isPackaged
    ? path.join(process.resourcesPath, 'tax-checks.md')
    : path.join(__dirname, '..', '..', 'tax-checks.md')
  if (!fs.existsSync(checksPath)) throw new Error('tax-checks.md not found')
  return fs.readFileSync(checksPath, 'utf8')
})

ipcMain.handle('files:saveSample', (_e, sessionData) => {
  const extractedData = sessionData.extractedData || null
  const sample = {
    extractedData: extractedData
      ? { ...extractedData, verificationResults: sessionData.verificationResults || [] }
      : null,
    analysisResults: sessionData.analysisResults || null,
    checksResults: sessionData.checksResults || null
  }
  fs.mkdirSync(path.dirname(SAMPLE_PATH), { recursive: true })
  fs.writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 2), 'utf8')
  return { success: true, path: SAMPLE_PATH }
})

// ── LLM IPC ──────────────────────────────────────────────────────────────────

const PROVIDERS = {
  anthropic: () => import('./providers/anthropic.js'),
  openai: () => import('./providers/openai.js'),
  gemini: () => import('./providers/gemini.js')
}

ipcMain.handle('llm:providers', async () => {
  const result = []
  for (const [id, loader] of Object.entries(PROVIDERS)) {
    const p = await loader()
    result.push({ id: p.id, name: p.name, defaultModel: p.defaultModel, models: p.models })
  }
  return result
})

// Streams sampleText character-by-character over ~durationMs milliseconds
async function streamSampleText(sampleText, durationMs, event, sessionId, logName) {
  const chunkSize = Math.max(1, Math.ceil(sampleText.length / 200))
  const delay = durationMs / Math.ceil(sampleText.length / chunkSize)
  for (let i = 0; i < sampleText.length; i += chunkSize) {
    const chunk = sampleText.slice(i, i + chunkSize)
    event.sender.send('llm:chunk', { text: chunk, sessionId, logName })
    await new Promise(r => setTimeout(r, delay))
  }
  return { text: sampleText }
}

ipcMain.handle('llm:call', async (event, { provider: providerId = 'anthropic', apiKey, model, prompt, messages, systemPrompt, files, sessionId, logName, useSessionFiles }) => {
  // ── Mock provider: slow-stream from sample.json ───────────────────────────
  if (providerId === 'mock' && logName) {
    let sampleText = null
    if (fs.existsSync(SAMPLE_PATH)) {
      const sample = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'))
      if (logName.startsWith('extract-') && sample.extractedData) sampleText = JSON.stringify(sample.extractedData, null, 2)
      if (logName.startsWith('analyze-') && sample.analysisResults) sampleText = JSON.stringify(sample.analysisResults, null, 2)
      if (logName.startsWith('checks-') && sample.checksResults) sampleText = JSON.stringify(sample.checksResults, null, 2)
    }
    if (sampleText) {
      return streamSampleText(sampleText, 10000, event, sessionId, logName)
    }
    return { text: '[]' }
  }

  // ── Legacy dry-run mode ───────────────────────────────────────────────────
  if (DRY_RUN && logName) {
    let sampleText = null
    if (fs.existsSync(SAMPLE_PATH)) {
      const sample = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'))
      if (logName.startsWith('extract-') && sample.extractedData) sampleText = JSON.stringify(sample.extractedData)
      if (logName.startsWith('analyze-') && sample.analysisResults) sampleText = JSON.stringify(sample.analysisResults)
      if (logName.startsWith('checks-') && sample.checksResults) sampleText = JSON.stringify(sample.checksResults)
    }
    if (sampleText) {
      event.sender.send('llm:chunk', { text: sampleText, sessionId, logName })
      return { text: sampleText }
    }
  }

  const providerModule = await (PROVIDERS[providerId] || PROVIDERS.anthropic)()

  const resolvedFilePaths = useSessionFiles && sessionId
    ? sessions.readSessionFiles(sessionId)
    : (files || [])

  let outputDir
  if (useSessionFiles && sessionId) {
    const sessionDir = sessions.getSessionDir(sessionId)
    if (sessionDir) {
      outputDir = path.join(sessionDir, 'output')
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    }
  }

  const { processedFiles, fileMetadata } = await processFiles(resolvedFilePaths, outputDir)

  if (sessionId && Object.keys(fileMetadata).length > 0) {
    const existing = sessions.get(sessionId)
    if (existing) sessions.save(sessionId, { ...existing, fileMetadata })
  }

  const onChunk = (text) => {
    event.sender.send('llm:chunk', { text, sessionId, logName })
  }

  const startTime = Date.now()
  let result

  if (providerId === 'gemini') {
    // Gemini builds its own contents internally from raw params
    result = await providerModule.stream({
      apiKey, model: model || providerModule.defaultModel,
      processedFiles, prompt, messages, systemPrompt, onChunk
    })
  } else {
    const apiMessages = providerModule.buildMessages(processedFiles, prompt, messages, systemPrompt)
    result = await providerModule.stream({
      apiKey, model: model || providerModule.defaultModel,
      messages: apiMessages,
      systemPrompt: providerId !== 'openai' ? systemPrompt : undefined,
      onChunk
    })
  }

  if (sessionId && logName) {
    sessions.saveClaudeLog(sessionId, logName, {
      prompt, response: result.text,
      model: model || providerModule.defaultModel,
      provider: providerId,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime
    })
  }

  return { text: result.text }
})
