import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    get: (id) => ipcRenderer.invoke('sessions:get', id),
    save: (id, data) => ipcRenderer.invoke('sessions:save', id, data),
    delete: (id) => ipcRenderer.invoke('sessions:delete', id)
  },
  files: {
    openPicker: () => ipcRenderer.invoke('files:openPicker'),
    copyToSession: (sessionId, filePaths) =>
      ipcRenderer.invoke('files:copyToSession', sessionId, filePaths),
    readPrompt: (name) => ipcRenderer.invoke('files:readPrompt', name),
    readChecks: () => ipcRenderer.invoke('files:readChecks'),
    saveSample: (sessionData) => ipcRenderer.invoke('files:saveSample', sessionData),
    countSessionFiles: (sessionId) => ipcRenderer.invoke('files:countSessionFiles', sessionId)
  },
  config: {
    saveSampleEnabled: () => ipcRenderer.invoke('config:saveSampleEnabled')
  },
  llm: {
    providers: () => ipcRenderer.invoke('llm:providers'),
    call: (params) => ipcRenderer.invoke('llm:call', params),
    onChunk: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('llm:chunk', handler)
      return () => ipcRenderer.removeListener('llm:chunk', handler)
    }
  }
})
