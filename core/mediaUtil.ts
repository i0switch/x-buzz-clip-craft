import { spawn } from 'child_process';
import path from 'path';

/**
 * メディアファイルの幅と高さをFFprobeを使って取得する。
 * @param filePath メディアファイルへの絶対パス
 * @returns 幅と高さを含むオブジェクト
 */
export async function getMediaDimensions(filePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // FFprobeがPATHにあることを前提とする
    const ffprobeProcess = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json',
      filePath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobeProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobeProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobeProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          if (result.streams && result.streams.length > 0) {
            const { width, height } = result.streams[0];
            resolve({ width, height });
          } else {
            reject(new Error(`No video stream found in ${filePath}`));
          }
        } catch (e) {
          const msg = (e as any)?.message || String(e);
          reject(new Error(`Failed to parse ffprobe output for ${filePath}: ${msg}`));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
      }
    });

    ffprobeProcess.on('error', (err) => {
      reject(new Error(`Failed to start ffprobe process: ${err.message}`));
    });
  });
}
