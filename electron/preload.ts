
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// preload.tsはelectron/にあるので、app/へは'../'でアクセス
import { IPC_CHANNELS, IpcApi } from '../app/events';

// レンダラープロセスに公開するAPI
// Keep type loose internally to avoid strict mapping friction, then cast on expose
const api: any = {
  // --- Settings ---
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  setSettings: (newSettings: any) => ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, newSettings),

  // --- File System ---
  openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG),
  openDirectoryDialog: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_DIRECTORY_DIALOG),
  openPathInExplorer: (path: any) => ipcRenderer.send(IPC_CHANNELS.OPEN_PATH_IN_EXPLORER, path),

  // --- Ingest & Render ---
  ingestPost: (url: any) => ipcRenderer.invoke(IPC_CHANNELS.INGEST_POST, url),
  renderVideo: (options: any) => ipcRenderer.invoke(IPC_CHANNELS.RENDER_VIDEO, options),

  // --- General ---
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),

  // --- Event Subscription ---
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    const subscription = (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args);
    ipcRenderer.on(channel, subscription);
  },
  off: (channel: any, listener: any) => {
    ipcRenderer.removeListener(channel, listener);
  },
  onRenderProgress: (callback: any) => {
    ipcRenderer.on(IPC_CHANNELS.RENDER_PROGRESS, (_event, msg) => callback(msg as string));
  },
};

// 'api'という名前でwindowオブジェクトに公開
contextBridge.exposeInMainWorld('api', api as IpcApi);
