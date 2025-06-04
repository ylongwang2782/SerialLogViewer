const { app, BrowserWindow, ipcMain } = require('electron');
const { SerialPort } = require('serialport');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Serial port operations
let serialPort = null;

ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      description: port.manufacturer || port.friendlyName || port.pnpId || ''
    }));
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
});

ipcMain.handle('open-port', async (event, { path, baudRate }) => {
  try {
    if (serialPort) {
      await serialPort.close();
    }
    serialPort = new SerialPort({ path, baudRate: parseInt(baudRate) });
    
    serialPort.on('data', (data) => {
      mainWindow.webContents.send('serial-data', data);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('close-port', async () => {
  try {
    if (serialPort) {
      await serialPort.close();
      serialPort = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-data', async (event, { data, isHex }) => {
  try {
    if (!serialPort) {
      throw new Error('Serial port not opened');
    }

    let buffer;
    if (isHex) {
      // Convert hex string to buffer
      buffer = Buffer.from(data.replace(/\s/g, ''), 'hex');
    } else {
      buffer = Buffer.from(data);
    }

    await serialPort.write(buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}); 