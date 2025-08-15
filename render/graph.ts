// render/graph.ts (clean implementation)

import { AppSettings } from '../core/settings';

// 基本的な解像度型
export interface Dimensions {
  width: number;
  height: number;
}

// 80%内接スケールの結果
export interface ScaledDimensions extends Dimensions {
  scale: number;
}

// 80%内接スケール計算（常にキャンバスの80%以内に収める）
export const calculateContainScale = (
  canvasSize: Dimensions,
  elementSize: Dimensions
): ScaledDimensions => {
  if (elementSize.width === 0 || elementSize.height === 0) {
    return { width: 0, height: 0, scale: 0 };
  }
  const targetWidth = canvasSize.width * 0.8;
  const targetHeight = canvasSize.height * 0.8;
  const scaleX = targetWidth / elementSize.width;
  const scaleY = targetHeight / elementSize.height;
  const scale = Math.min(scaleX, scaleY);
  return {
    width: Math.round(elementSize.width * scale),
    height: Math.round(elementSize.height * scale),
    scale,
  };
};

// テキストオーバーレイ（黒背景・パディング・縁取り）
export const createTextFilter = (text: string, render: AppSettings['render']): string => {
  const { textOverlay } = render;
  const escaped = (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');

  // drawtext は角丸を直接サポートしないため、角丸は近似（将来: drawbox+alpha で背景領域を別途生成）
  return [
    'drawtext=',
    "fontfile='C\\:/Windows/Fonts/YuGothM.ttc':",
    `text='${escaped}':`,
    'fontcolor=white:',
    `fontsize=${textOverlay.fontSize}:`,
    'box=1:',
    `boxcolor=black@${textOverlay.boxOpacity}:`,
    `boxborderw=${textOverlay.boxPadding}:`,
    'borderw=2:',
    'bordercolor=white@0.9:',
    'x=(w-text_w)/2:',
    'y=h-text_h-(h*0.05)'
  ].join('');
};

// 合成用フィルタグラフ（背景+画像(必須)+動画(任意)+テキスト）
export const createFullFilterGraph = (
  _backgroundVideoPath: string, // 参照しないが将来の拡張に備えて受け取る
  backgroundVideoDimensions: Dimensions,
  _overlayImagePath: string,
  screenshotDimensions: Dimensions,
  _overlayVideoPath: string | undefined,
  overlayVideoDimensions: Dimensions,
  postText: string,
  settings: AppSettings
): string => {
  const canvas = { width: backgroundVideoDimensions.width, height: backgroundVideoDimensions.height };

  // 1) 背景: [0:v] はそのままキャンバス
  let graph = `[0:v]scale=${canvas.width}:${canvas.height},setsar=1[bg];`;

  // 2) 画像(スクショ)の80%内接スケール → 中央オーバーレイ
  const imgScaled = calculateContainScale(canvas, screenshotDimensions);
  const position = settings.render.overlayPosition || 'center';
  const centerX = Math.round((canvas.width - imgScaled.width) / 2);
  const centerY = Math.round((canvas.height - imgScaled.height) / 2);
  const topY = Math.round(canvas.height * 0.1); // 10% margin from top
  const bottomY = Math.round(canvas.height - imgScaled.height - canvas.height * 0.1);
  const imgX = centerX;
  const imgY = position === 'top-center' ? topY : position === 'bottom-center' ? bottomY : centerY;
  graph += `[1:v]scale=${imgScaled.width}:${imgScaled.height}[img];`;
  graph += `[bg][img]overlay=${imgX}:${imgY}[lay1];`;

  // 3) オプションの動画オーバーレイ（存在時のみ）
  let current = 'lay1';
  if (overlayVideoDimensions.width > 0 && overlayVideoDimensions.height > 0) {
    const vidScaled = calculateContainScale(canvas, overlayVideoDimensions);
    const vX = Math.round((canvas.width - vidScaled.width) / 2);
    const vCenterY = Math.round((canvas.height - vidScaled.height) / 2);
    const vTopY = Math.round(canvas.height * 0.1);
    const vBottomY = Math.round(canvas.height - vidScaled.height - canvas.height * 0.1);
    const vY = position === 'top-center' ? vTopY : position === 'bottom-center' ? vBottomY : vCenterY;
    graph += `[2:v]scale=${vidScaled.width}:${vidScaled.height}[vid];`;
    graph += `[${current}][vid]overlay=${vX}:${vY}[lay2];`;
    current = 'lay2';
  }

  // 4) テキストオーバーレイ（黒背景・縁取り）。常にキャンバス80%以内で配置される drawtext を使用。
  const textFilter = createTextFilter(postText, settings.render);
  graph += `[${current}]${textFilter}[out]`;

  return graph;
};
