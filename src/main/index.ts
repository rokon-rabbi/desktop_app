import { join } from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { registerIpcHandlers } from './ipc';
import { getRepositories, closeDatabase } from './database';
import { logger } from './safety/logger';
import type { FolderMonitor } from './monitoring';

let mainWindow: BrowserWindow | null = null;
let monitor: FolderMonitor | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 980,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0d10',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Any link a user clicks that would open a new window opens in the
  // system browser instead of a second, unmanaged Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServerUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const repos = getRepositories();
  monitor = registerIpcHandlers(repos, () => mainWindow);
  createWindow();
  logger.info('main', 'CleanSpace started');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  void monitor?.closeAll();
  closeDatabase();
});
