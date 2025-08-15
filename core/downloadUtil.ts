import { createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { get } from 'https';
import { get as httpGet } from 'http';

/**
 * 指定されたURLからファイルをダウンロードし、ローカルパスに保存する。
 * @param url ダウンロードするファイルのURL
 * @param destinationPath 保存先の絶対パス
 * @returns ダウンロードされたファイルの絶対パス
 */
export async function downloadFile(url: string, destinationPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? get : httpGet;

    client(url, async (response) => {
      if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
        return reject(new Error(`Failed to download file: HTTP Status Code ${response.statusCode}`));
      }

      try {
        await pipeline(response, createWriteStream(destinationPath));
        resolve(destinationPath);
      } catch (error) {
        const msg = (error as any)?.message || String(error);
        reject(new Error(`Failed to save file: ${msg}`));
      }
    }).on('error', (err) => {
      reject(new Error(`Failed to make HTTP request: ${err.message}`));
    });
  });
}
