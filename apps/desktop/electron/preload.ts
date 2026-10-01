import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('openkeet', {
  identityCreate: () => ipcRenderer.invoke('openkeet:identity:create'),
  identityImport: (mnemonic: string) => ipcRenderer.invoke('openkeet:identity:import', mnemonic),
  roomCreate: () => ipcRenderer.invoke('openkeet:room:create'),
  roomJoin: (invite: string) => ipcRenderer.invoke('openkeet:room:join', invite),
  roomSend: (topicZ32: string, text: string) => ipcRenderer.invoke('openkeet:room:send', topicZ32, text),
  roomList: (topicZ32: string) => ipcRenderer.invoke('openkeet:room:list', topicZ32),
  exportText: (text: string) => ipcRenderer.invoke('openkeet:dialog:export', text)
})
