const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listPorts: () => ipcRenderer.invoke('list-ports'),
  openPort: (options) => ipcRenderer.invoke('open-port', options),
  closePort: () => ipcRenderer.invoke('close-port'),
  sendData: (data) => ipcRenderer.invoke('send-data', data),
  onSerialData: (callback) => ipcRenderer.on('serial-data', callback),
  removeSerialDataListener: () => ipcRenderer.removeAllListeners('serial-data')
}); 