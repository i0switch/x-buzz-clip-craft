# Welcome to your Lovable project

## 注意: モック素材について
`assets/mock/` フォルダには、ffmpegで合成テストを行うために本物の画像(PNG)・動画(MP4)ファイルを配置してください。
（テキストファイルではffmpegが失敗します。サンプル素材はフリー素材サイト等から取得可能です）

## Project info

**URL**: https://lovable.dev/projects/34ac6f95-6eea-4151-975a-f880f950656f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/34ac6f95-6eea-4151-975a-f880f950656f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/34ac6f95-6eea-4151-975a-f880f950656f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Windows デスクトップアプリとしての利用

本プロジェクトは Electron + Vite 構成です。GUI から以下の要件を満たします:

- X ポストの取得（設定でスクレイピングをONにすると有効。既定はモックで完走）
- 背景動画上にスクショ/短尺動画を貼付（常にキャンバスの80%以内で内接スケール）
- テキストオーバーレイ（黒背景・パディング・縁取りを自動適用）
- 書き出し（`output/` へ保存）

品質プリセットはエンコード設定に反映されます:

- 低品質: CRF 28 / preset veryfast（高速・小容量）
- 標準品質: CRF 23 / preset fast（バランス）
- 高品質: CRF 18 / preset slow（高品質・大容量）

### 使い方（開発）

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/setup.ps1    # 依存取得
npm run dev                                                      # Vite 起動

# 別途 Electron で `dist-electron/main.js` を起動
# (例) electron dist-electron/main.js
```

スクレイピングを有効にする場合は、設定画面で「スクレイピングを有効にする」をONにし、Xのクッキーを入力してください（利用規約に留意）。

### 配布物の作成（exe/MSI/Portable）

前提: Windows 10/11 x64、Node.js、npm が導入済み。

1) まず依存を入れてビルドします。

```powershell
npm i
npm run build            # Vite renderer
npm run build:electron   # Electron main/preload (TS -> JS)
```

2) electron-builder で配布物を作成します。

```powershell
# EXE(NSIS) + MSI + Portable をまとめて作成
npm run package:win

# あるいはターゲット別
npm run package:portable
npm run package:msi
```

生成物は `release/` に出力されます。

### Portable パッケージの作成（Electron 非同梱の軽量版）

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/make-portable.ps1
```

- `dist-win-portable.zip` が生成されます
- 解凍後、`run-portable.bat` を実行します（ローカルに Electron が必要）

Electron を同梱しない軽量ポータブルです。配布先に Node/Electron を入れたくない場合は、electron-builder でのインストーラ作成を推奨します（本リポでも electron-builder 設定を提供）。

### 依存（重要）

- FFmpeg/FFprobe: PATH に `ffmpeg` / `ffprobe` が存在する必要があります。
- スクレイピング（任意）: Playwright を利用します。設定で ON にした場合のみ使用し、失敗時はモックにフォールバックします。ビルドは Playwright 未導入でも通るよう遅延ロードしています。
  - スクレイピングを有効にする場合は、必要に応じて `npm i -D playwright` 実行後に `npx playwright install` を実行してください。

## スモークテスト（E2E自動検証）

PowerShell で以下を実行すると、モック素材から合成の雛形を実行します。

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/smoke.ps1
```

- 生成物は `output/smoke_out.mp4` を想定します

## 自動化スケジューラ

- 設定 > 一般 で「監視URL」を設定し、取得設定で「自動化スケジューラ」をONにすると、指定間隔ごとに取得→合成を実行します。
