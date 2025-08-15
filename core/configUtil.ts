
// core/configUtil.ts

import fs from 'fs';
import path from 'path';
import { AppSettings, getDefaultSettings } from './settings';

const CONFIG_FILE_NAME = 'config.json';

/**
 * 設定を同期的に読み込む
 * @param baseDir アプリケーションのルートディレクトリ
 * @returns {AppSettings} 読み込んだ設定
 */
export const loadSettings = (baseDir: string): AppSettings => {
  const configPath = path.join(baseDir, CONFIG_FILE_NAME);

  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const loadedSettings = JSON.parse(fileContent) as AppSettings;
      // TODO: ここでスキーマバージョンのチェックやマイグレーション処理を入れる
      return loadedSettings;
    } catch (error) {
      console.error('Error reading or parsing config.json, falling back to default settings.', error);
      return getDefaultSettings();
    }
  } else {
    // ファイルが存在しない場合はデフォルト設定を保存して返す
    const defaultSettings = getDefaultSettings();
    saveSettings(baseDir, defaultSettings);
    return defaultSettings;
  }
};

/**
 * 設定を同期的に保存する
 * @param baseDir アプリケーションのルートディレクトリ
 * @param settings 保存する設定
 */
export const saveSettings = (baseDir: string, settings: AppSettings): void => {
  const configPath = path.join(baseDir, CONFIG_FILE_NAME);
  try {
    // UIの一時的な状態は保存しない
    const settingsToSave = { ...settings };
    delete settingsToSave.ui;

    const jsonContent = JSON.stringify(settingsToSave, null, 2);
    fs.writeFileSync(configPath, jsonContent, 'utf-8');
  } catch (error) {
    console.error('Error saving config.json.', error);
    // ここでエラーを呼び出し元に伝えるべきか、あるいは通知を出すべきか
    // アプリケーションの要件に応じてハンドリングを決定
    throw error; // 現状はエラーをスローする
  }
};
