
// app/events.ts

import { AppSettings } from "../core/settings";

/**
 * IPC通信で使用するチャンネル名を定義します。
 * このオブジェクトをレンダラープロセスとメインプロセスで共有することで、
 * チャンネル名のタイプセーフを確保します。
 */
export const IPC_CHANNELS = {
  // --- Settings --- //
  /** 設定の取得を要求 */
  GET_SETTINGS: 'settings:get',
  /** 設定の保存を要求 */
  SET_SETTINGS: 'settings:set',

  // --- File System --- //
  /** ファイルダイアログを開く */
  OPEN_FILE_DIALOG: 'fs:open-file-dialog',
  /** ディレクトリダイアログを開く */
  OPEN_DIRECTORY_DIALOG: 'fs:open-directory-dialog',
  /** 指定したパスをエクスプローラーで開く */
  OPEN_PATH_IN_EXPLORER: 'fs:open-path-in-explorer',

  // --- Ingest & Render --- //
  /** 指定したURLからポスト情報を取得 */
  INGEST_POST: 'ingest:post',
  /** 動画合成を開始 */
  RENDER_VIDEO: 'render:video',
  /** 動画合成の進捗更新 */
  RENDER_PROGRESS: 'render:progress',
  /** 動画合成の完了 */
  RENDER_COMPLETE: 'render:complete',
  /** 動画合成のエラー */
  RENDER_ERROR: 'render:error',

  // --- General --- //
  /** アプリケーションのバージョンを取得 */
  GET_APP_VERSION: 'app:get-version',
};

/**
 * IPCイベントのペイロードの型定義
 */
export interface IpcEvents {
  [IPC_CHANNELS.GET_SETTINGS]: () => Promise<AppSettings>;
  [IPC_CHANNELS.SET_SETTINGS]: (newSettings: AppSettings) => Promise<void>;

  [IPC_CHANNELS.OPEN_FILE_DIALOG]: () => Promise<string | undefined>;
  [IPC_CHANNELS.OPEN_DIRECTORY_DIALOG]: () => Promise<string | undefined>;
  [IPC_CHANNELS.OPEN_PATH_IN_EXPLORER]: (path: string) => void;

  [IPC_CHANNELS.INGEST_POST]: (url: string) => Promise<any>; // PostDataを返す
  [IPC_CHANNELS.RENDER_VIDEO]: (options: any) => Promise<void>; // RenderOptions

  [IPC_CHANNELS.GET_APP_VERSION]: () => Promise<string>;
}

/**
 * レンダラーからメインへの呼び出しを型安全に行うためのAPI
 * preload.ts で window.api に公開される
 */
export type IpcApi = {
  // IpcEventsで定義されたメソッド
  [K in keyof IpcEvents]: (...args: Parameters<IpcEvents[K]>) => ReturnType<IpcEvents[K]>;
} & {
  // イベント購読のためのメソッドを明示的に追加
  on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void;
  off: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => void;
  onRenderProgress?: (callback: (msg: string) => void) => void;
};
