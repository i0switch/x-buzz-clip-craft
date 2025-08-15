// ingest/providers/MockProvider.ts

import path from 'path';

/**
 * 取得したポストのデータ構造
 */
export interface PostData {
  /** ポストのユニークID */
  id: string;
  /** 投稿者の名前 */
  author: string;
  /** ポストのテキスト本文 */
  text: string;
  /** スクリーンショット画像のファイルパス */
  screenshotPath: string;
  /** 添付されている動画のファイルパス (あれば) */
  videoPath?: string;
  /** 投稿日時 */
  createdAt: Date;
}

/**
 * プロバイダのインターフェース (将来的にScrapeProviderと共通化)
 */
export interface IngestProvider {
  getLatestPost(url: string): Promise<PostData>;
}

/**
 * ネットワーク不要でダミーデータを返すモックプロバイダ
 */
export class MockProvider implements IngestProvider {
  private baseAssetPath: string;

  constructor(baseDir: string) {
    this.baseAssetPath = path.join(baseDir, 'assets', 'mock');
  }

  /**
   * モックのポストデータを返す
   * @param _url - URLは無視される
   * @returns {Promise<PostData>} モックデータ
   */
  public async getLatestPost(_url: string): Promise<PostData> {
    console.log('MockProvider: Providing mock data.');

    // 実際のファイルパスを返す
    const screenshotPath = path.join(this.baseAssetPath, 'xpost.png');
    const videoPath = path.join(this.baseAssetPath, 'short.mp4');

    // 意図的に少し待機して非同期処理を模倣する
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: `mock-${Date.now()}`,
      author: 'Mock User',
      text: `これはモックの投稿です.\nffmpeg のテストのために、いくつかの特殊文字: '"\\, と改行が含まれています。`,
      screenshotPath,
      videoPath,
      createdAt: new Date(),
    };
  }
}