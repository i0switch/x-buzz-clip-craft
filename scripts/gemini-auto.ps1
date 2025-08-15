# gemini-auto.ps1

param(
    # 実行する最大のステップ数
    [int]$MaxSteps = 15
)

$ErrorActionPreference = "Stop"

# --- 1. 環境チェック ---

# Node.jsのバージョンをチェック (v18以上必須)
Write-Host "🔎 Node.jsのバージョンを確認中..."
try {
    $nodeVersionOutput = (node --version)
    $majorVersion = [int]($nodeVersionOutput -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        throw "Node.jsのバージョンが古すぎます。v18以上が必要です。(現在: $nodeVersionOutput)"
    }
    Write-Host "✅ Node.js バージョンOK ($nodeVersionOutput)"
} catch {
    throw "Node.jsがインストールされていないか、パスが通っていません。`node --version`の実行に失敗しました。"
}

# Google APIキーの存在をチェック
if (-not $env:GOOGLE_API_KEY) {
    # 【根本対策】特殊な複数行文字列を完全にやめ、単純な文字列としてエラーメッセージを作成
    $line1 = "❌ 環境変数 'GOOGLE_API_KEY' が設定されていません。"
    $line2 = "このターミナルで以下のコマンドを実行して、一時的にキーを設定してください:"
    $line3 = '`$env:GOOGLE_API_KEY="ここにあなたのAPIキーを貼り付け"`'
    $errorMessage = $line1 + "`n`n" + $line2 + "`n" + $line3

    Write-Error $errorMessage
    exit 1
}
Write-Host "✅ GOOGLE_API_KEY 設定済み"

# --- 2. 起動準備 ---

# プロジェクトのルートフォルダを特定
$rootPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# 指示書ファイル (briefing) を探す
$briefingPath = @(
  (Join-Path $rootPath ".github\copilot-instructions.md"),
  (Join-Path $rootPath "copilot-instructions.md")
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $briefingPath) {
  Write-Error "❌ 指示書ファイル (copilot-instructions.md) がプロジェクトのルートまたは .github/ フォルダに見つかりません。"
  exit 1
}

# --- 3. エージェント実行 ---

# パラメータを環境変数経由でNode.jsスクリプトに渡す
$env:GEMINI_MAX_STEPS = $MaxSteps
$env:GEMINI_BRIEFING_PATH = $briefingPath

# メインスクリプトのパス
$nodeEntry = Join-Path $rootPath "tools\auto-gemini.mjs"
if (-not (Test-Path -LiteralPath $nodeEntry)) { throw "メインスクリプトが見つかりません: $nodeEntry" }


Write-Host "`n🚀 全自動モードでエージェントを起動します (指示書: $briefingPath)"
# --no-warnings: Fetch APIの実験的機能に関する警告を非表示
# --enable-source-maps: エラー発生時のスタックトレースを分かりやすくする
& node --no-warnings --enable-source-maps -- "$nodeEntry"
exit $LASTEXITCODE