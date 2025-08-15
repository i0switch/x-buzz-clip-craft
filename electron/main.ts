import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

// --- core ---
import { loadSettings, saveSettings } from '../core/configUtil';
import { AppSettings } from '../core/settings';
import { downloadFile } from '../core/downloadUtil';

// --- ingest ---
import { IngestProvider, MockProvider, PostData } from '../ingest/providers/MockProvider';
import { ScrapeProvider } from '../ingest/providers/ScrapeProvider';

// --- render ---
import { createFullFilterGraph } from '../render/graph';
import { getMediaDimensions } from '../core/mediaUtil';

// --- app ---
import { IPC_CHANNELS } from '../app/events';

// __dirname は Node.js のグローバル変数として利用可能

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
let scrapeProviderInstance: ScrapeProvider | null = null;
let schedulerTimer: NodeJS.Timeout | null = null;
let latestSettingsCache: AppSettings | null = null;

// Map quality preset to ffmpeg encoder options
function getFfmpegQuality(preset: AppSettings['render']['qualityPreset']): { crf: string; preset: string } {
  switch (preset) {
    case 'high':
      return { crf: '18', preset: 'slow' };
    case 'low':
      return { crf: '28', preset: 'veryfast' };
    case 'standard':
    default:
      return { crf: '23', preset: 'fast' };
  }
}

function createWindow() {
  win = new BrowserWindow({
    // icon: join(process.env.VITE_PUBLIC, 'favicon.ico'), // VITE_PUBLICは開発モードでのみ定義されるため修正
    webPreferences: {
      preload: join(__dirname, 'preload.js'), // main.jsと同じディレクトリにあるpreload.jsを指定
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', `Welcome! App version: ${app.getVersion()}` );
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    
  } else {
    // Fallback to ../dist if ENV not set
    const distPath = process.env.DIST || join(__dirname, '..', 'dist');
    win.loadFile(join(distPath, 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// --- App Lifecycle ---

app.on('window-all-closed', async () => {
  win = null;
  if (process.platform !== 'darwin') {
    if (scrapeProviderInstance) {
      await scrapeProviderInstance.dispose();
    }
    app.quit();
  }
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  }
});

app.whenReady().then(async () => {
  createWindow();
  // Initialize scraper lazily; only when enabled
});


// --- IPC Handlers ---

// アプリケーションのルートパス (x-buzz-clip-craft ディレクトリ)
const appRoot = join(__dirname, '..'); // main.tsはelectron/にあるので、ルートは'..'

// Settings
ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
  latestSettingsCache = loadSettings(appRoot);
  // Ensure output directory exists
  const fs = require('fs');
  const outDir = latestSettingsCache.general.outputPath;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  // Start/refresh scheduler according to settings
  refreshScheduler();
  return latestSettingsCache;
});
ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (event, newSettings: AppSettings) => {
  saveSettings(appRoot, newSettings);
  latestSettingsCache = newSettings;
  refreshScheduler();
});

// File System
ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async () => {
    if (!win) return;
    const result: Electron.OpenDialogReturnValue = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
          { name: 'Media Files', extensions: ['mp4','mov','mkv','avi','png','jpg','jpeg'] },
          { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result.canceled ? undefined : result.filePaths[0];
});
ipcMain.handle(IPC_CHANNELS.OPEN_DIRECTORY_DIALOG, async () => {
    if (!win) return;
    const result: Electron.OpenDialogReturnValue = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    });
    return result.canceled ? undefined : result.filePaths[0];
});
ipcMain.on(IPC_CHANNELS.OPEN_PATH_IN_EXPLORER, (event, path: string) => {
    if (path) {
        shell.openPath(path);
    }
});

// Ingest
ipcMain.handle(IPC_CHANNELS.INGEST_POST, async (event, url: string) => {
    const settings = latestSettingsCache || loadSettings(appRoot);
    let provider: IngestProvider;
    if (settings.ingest.provider === 'scrape' && settings.ingest.scrape.enabled) {
        try {
          if (!scrapeProviderInstance) {
              scrapeProviderInstance = new ScrapeProvider();
              await scrapeProviderInstance.initialize(settings.ingest.scrape.cookie);
          }
          provider = scrapeProviderInstance;
        } catch (err: any) {
          console.warn('Scraper init failed, falling back to mock:', err?.message);
          provider = new MockProvider(appRoot);
        }
    } else {
        provider = new MockProvider(appRoot);
    }
    try {
        const postData = await provider.getLatestPost(url);

        // If videoPath is a URL, download it locally
        if (postData.videoPath && (postData.videoPath.startsWith('http://') || postData.videoPath.startsWith('https://'))) {
            const tempDir = join(app.getPath('temp'), 'x-buzz-clip-craft');
            if (!existsSync(tempDir)) {
                mkdirSync(tempDir, { recursive: true });
            }
            const videoFileName = `video_${Date.now()}.mp4`; // Simple naming, consider more robust
            const localVideoPath = join(tempDir, videoFileName);
            console.log(`Downloading video from ${postData.videoPath} to ${localVideoPath}`);
            await downloadFile(postData.videoPath, localVideoPath);
            postData.videoPath = localVideoPath;
        }

        return { success: true, data: postData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Render (Placeholder)
ipcMain.handle(IPC_CHANNELS.RENDER_VIDEO, async (event, { postData, settings }: { postData: PostData, settings: AppSettings }) => {
    console.log('Render request received:', postData, settings);

    const backgroundVideoPath = settings.render.backgroundVideoPath || join(appRoot, 'assets', 'mock', 'short.mp4');
    const outputPath = join(appRoot, 'output', `output_${Date.now()}.mp4`);

    // Ensure output directory exists
    const outputDir = join(appRoot, 'output');
    const fs = require('fs'); // Using Node.js built-in 'fs' module for file system operations
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get dimensions of input media
    const backgroundVideoDimensions = await getMediaDimensions(backgroundVideoPath);
    const screenshotDimensions = await getMediaDimensions(postData.screenshotPath);
    let overlayVideoDimensions = { width: 0, height: 0 };
    if (postData.videoPath) {
        try {
            overlayVideoDimensions = await getMediaDimensions(postData.videoPath);
        } catch (_) { /* ignore */ }
    }

    const filterGraph = createFullFilterGraph(
        backgroundVideoPath,
        backgroundVideoDimensions,
        postData.screenshotPath,
        screenshotDimensions,
        postData.videoPath,
        overlayVideoDimensions,
        postData.text,
        settings
    );

    const ffmpegArgs = ['-y'];
    if (settings.render.loopBackground) {
        ffmpegArgs.push('-stream_loop', '-1');
    }
    ffmpegArgs.push('-i', backgroundVideoPath);
    ffmpegArgs.push('-i', postData.screenshotPath);
    if (postData.videoPath) {
        ffmpegArgs.push('-i', postData.videoPath);
    }
    const quality = getFfmpegQuality(settings.render.qualityPreset);
    ffmpegArgs.push(
        '-filter_complex', filterGraph,
        '-map', '[out]',
        '-c:v', 'libx264',
        '-crf', quality.crf,
        '-preset', quality.preset,
        outputPath
    );

    return new Promise((resolve) => {
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

        ffmpegProcess.stdout.on('data', (data) => {
            win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, data.toString());
        });
        ffmpegProcess.stderr.on('data', (data) => {
            win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, data.toString());
        });
        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, outputPath });
            } else {
                resolve({ success: false, error: `ffmpeg exited with code ${code}` });
            }
        });
        ffmpegProcess.on('error', (err) => {
            resolve({ success: false, error: `Failed to start ffmpeg: ${err.message}` });
        });
    });
});

// General
ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion();
});

// --- Scheduler Helpers ---
async function runPipelineOnce(targetUrl?: string) {
  try {
    const url = targetUrl || latestSettingsCache?.general.watchUrl;
    if (!url) {
      win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, 'No watchUrl configured; skipping.');
      return;
    }
    win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, `Scheduler: ingest ${url}`);
    const ingestRes: any = await (ipcMain as any).handle?.(IPC_CHANNELS.INGEST_POST) ? await (async () => ({ success: false }))() : { success: false };
    // Fallback: call provider directly to avoid IPC recursion complexities
    const settings = latestSettingsCache || loadSettings(appRoot);
    let provider: IngestProvider = new MockProvider(appRoot);
    if (settings.ingest.provider === 'scrape' && settings.ingest.scrape.enabled) {
      try {
        if (!scrapeProviderInstance) { scrapeProviderInstance = new ScrapeProvider(); await scrapeProviderInstance.initialize(settings.ingest.scrape.cookie); }
        provider = scrapeProviderInstance;
      } catch { provider = new MockProvider(appRoot); }
    }
    const postData = await provider.getLatestPost(url);
    const renderRes: any = await (ipcMain as any).handle?.(IPC_CHANNELS.RENDER_VIDEO) ? await (async () => ({ success: false }))() : { success: false };
    // Fallback: call renderer function via same logic used in handler
    const backgroundVideoPath = settings.render.backgroundVideoPath || join(appRoot, 'assets', 'mock', 'short.mp4');
    const outputPath = join(appRoot, 'output', `output_${Date.now()}.mp4`);
    const fs = require('fs');
    if (!fs.existsSync(join(appRoot, 'output'))) { fs.mkdirSync(join(appRoot, 'output'), { recursive: true }); }
    const backgroundVideoDimensions = await getMediaDimensions(backgroundVideoPath);
    const screenshotDimensions = await getMediaDimensions(postData.screenshotPath);
    let overlayVideoDimensions = { width: 0, height: 0 } as any;
    if (postData.videoPath) {
      try { overlayVideoDimensions = await getMediaDimensions(postData.videoPath); } catch {}
    }
    const filterGraph = createFullFilterGraph(
      backgroundVideoPath,
      backgroundVideoDimensions,
      postData.screenshotPath,
      screenshotDimensions,
      postData.videoPath,
      overlayVideoDimensions,
      postData.text,
      settings
    );
    const ffmpegArgs = ['-y'];
    if (settings.render.loopBackground) { ffmpegArgs.push('-stream_loop', '-1'); }
    ffmpegArgs.push('-i', backgroundVideoPath);
    ffmpegArgs.push('-i', postData.screenshotPath);
    if (postData.videoPath) { ffmpegArgs.push('-i', postData.videoPath); }
    const q2 = getFfmpegQuality(settings.render.qualityPreset);
    ffmpegArgs.push('-filter_complex', filterGraph, '-map', '[out]', '-c:v', 'libx264', '-crf', q2.crf, '-preset', q2.preset, outputPath);
    await new Promise<void>((resolve) => {
      const ff = spawn('ffmpeg', ffmpegArgs);
      ff.stderr.on('data', (d) => win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, d.toString()));
      ff.on('close', () => resolve());
      ff.on('error', (e) => win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, `ffmpeg error: ${e.message}`));
    });
    win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, `Scheduler: done -> ${outputPath}`);
  } catch (e: any) {
    win?.webContents.send(IPC_CHANNELS.RENDER_PROGRESS, `Scheduler error: ${e?.message || e}`);
  }
}

function refreshScheduler() {
  const s = latestSettingsCache || loadSettings(appRoot);
  if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
  if (s.scheduler.enabled) {
    const intervalMs = Math.max(1, s.scheduler.intervalMinutes) * 60 * 1000;
    schedulerTimer = setInterval(() => { runPipelineOnce(s.general.watchUrl); }, intervalMs);
  }
}
