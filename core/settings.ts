// core/settings.ts

/**
 * アプリケーションの設定項目を定義するインターフェース。
 * この構造は config.json に保存される。
 */
export interface AppSettings {
  /** スキーマバージョン */
  schemaVersion: string;

  /** 一般設定 */
  general: {
    /** 出力先ディレクトリ */
    outputPath: string;
    /** ログレベル */
    logLevel: 'info' | 'warn' | 'error' | 'debug';
    /** ロケール (i18n用) */
    locale: string;
    /** 監視対象のURL（スケジューラで使用） */
    watchUrl?: string;
  };

  /** 取得プロバイダの設定 */
  ingest: {
    /** 使用するプロバイダ */
    provider: 'mock' | 'scrape';
    /** スクレイピング設定 */
    scrape: {
      /** スクレイピングを有効にするか */
      enabled: boolean;
      /** X (Twitter) の認証クッキー */
      cookie: string;
    };
  };

  /** 動画合成の設定 */
  render: {
    /** 背景動画のパス */
    backgroundVideoPath: string;
    /** 背景動画をループさせるか */
    loopBackground: boolean;
    /**
     * 貼り付け要素の配置位置
     * - center: 中央
     * - top-center: 上部中央
     * - bottom-center: 下部中央
     * - custom: カスタム座標 (未実装)
     */
    overlayPosition: 'center' | 'top-center' | 'bottom-center' | 'custom';
    /** 品質プリセット */
    qualityPreset: 'low' | 'standard' | 'high';
    /** テキストオーバーレイのスタイル */
    textOverlay: {
      /** フォントサイズ */
      fontSize: number;
      /** 背景の不透明度 (0.0 - 1.0) */
      boxOpacity: number;
      /** パディング (px) */
      boxPadding: number;
    };
  };

  /** スケジューラ設定 */
  scheduler: {
    /** 自動実行を有効にするか */
    enabled: boolean;
    /** 実行間隔 (分) */
    intervalMinutes: number;
  };

  /** UIの状態 (保存しない一時的な状態) */
  ui?: {
    /** 現在のタブ */
    activeTab?: string;
    /** ウィンドウサイズなど */
    windowBounds?: { width: number; height: number; x: number; y: number };
  };
}

/**
 * デフォルト設定
 * @returns {AppSettings}
 */
export const getDefaultSettings = (): AppSettings => ({
  schemaVersion: '1.0.0',
  general: {
    outputPath: './output',
    logLevel: 'info',
    locale: 'ja',
    watchUrl: 'https://twitter.com/username',
  },
  ingest: {
    provider: 'mock',
    scrape: {
      enabled: false,
      cookie: '',
    },
  },
  render: {
    backgroundVideoPath: './assets/mock/short.mp4', // デフォルトの同梱素材
    loopBackground: true,
    overlayPosition: 'center',
    qualityPreset: 'standard',
    textOverlay: {
      fontSize: 48,
      boxOpacity: 0.8,
      boxPadding: 20,
    },
  },
  scheduler: {
    enabled: false,
    intervalMinutes: 60,
  },
});
