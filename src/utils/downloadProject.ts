// プロジェクトファイルをローカルにダウンロードする機能

export const downloadProjectAsZip = async () => {
  try {
    // JSZipライブラリを動的インポート
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // プロジェクトファイルのリスト
    const files = [
      'src/App.tsx',
      'src/main.tsx',
      'src/index.css',
      'src/pages/Index.tsx',
      'src/pages/Settings.tsx',
      'src/pages/Setup.tsx',
      'src/components/AppLayout.tsx',
      'src/components/Seo.tsx',
      'src/hooks/use-settings.ts',
      'src/lib/utils.ts',
      'tailwind.config.ts',
      'vite.config.ts',
      'index.html',
      'config.json',
      'core/settings.ts',
      'core/configUtil.ts'
    ];

    // 各ファイルの内容を取得してZIPに追加
    for (const filePath of files) {
      try {
        const response = await fetch(`/${filePath}`);
        if (response.ok) {
          const content = await response.text();
          zip.file(filePath, content);
        }
      } catch (error) {
        console.warn(`ファイル ${filePath} を取得できませんでした:`, error);
      }
    }

    // package.jsonの内容を生成
    const packageJson = {
      "name": "xbuzz-clip-craft",
      "version": "1.0.0",
      "description": "アダアフィ用ショート動画支援アプリ（仮）",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview"
      },
      "dependencies": {
        "@tanstack/react-query": "^5.83.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.30.1",
        "lucide-react": "^0.462.0",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.6.0",
        "class-variance-authority": "^0.7.1"
      },
      "devDependencies": {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        "@vitejs/plugin-react": "^4.3.4",
        "typescript": "~5.6.2",
        "vite": "^5.4.10",
        "tailwindcss": "^3.4.15",
        "autoprefixer": "^10.4.20",
        "postcss": "^8.5.55"
      }
    };

    zip.file('package.json', JSON.stringify(packageJson, null, 2));

    // README.mdを生成
    const readme = `# アダアフィ用ショート動画支援アプリ（仮）

## セットアップ

\`\`\`bash
npm install
npm run dev
\`\`\`

## 機能

- X(Twitter)アカウント監視
- YouTube, TikTok, Instagram監視設定
- ショート動画生成設定
- 自動化スケジューラ

## 設定

アプリの設定は \`config.json\` ファイルで管理されます。

`;

    zip.file('README.md', readme);

    // ZIPファイルを生成してダウンロード
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbuzz-clip-craft-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('プロジェクトのダウンロードに失敗しました:', error);
    return false;
  }
};