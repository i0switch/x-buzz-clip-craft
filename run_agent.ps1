# run_agent.ps1 - 完全自律型AIエージェント制御スクリプト

# --- 初期設定 ---
$MaxRetries = 5 # 無限ループを防ぐための最大試行回数
$Instructions = Get-Content -Path "./copilot-instructions.md" -Raw

# --- 初動ルール：1. 自己点検 & 2. 作業計画生成 ---
Write-Output "フェーズ1: 自己点検と作業計画の生成を開始..."
$initialPrompt = @"
$Instructions

あなたは指示書に従う完全自律型AIエージェントです。
現在のワークスペースの全ファイルを読み込み、現状を分析してください。
そして、受入基準を満たすために必要な「具体的な作業手順のリスト」を生成してください。
リストは番号付きで、各項目は単一の具体的なアクション（例：「〇〇ファイルに××関数を実装する」）にしてください。
この計画を 'plan.txt' というファイル名で出力してください。説明や挨拶は不要です。
"@

# CodexCLIを呼び出して計画を生成
CodexCLI --prompt $initialPrompt --read-workspace --output "plan.txt"

if (-not (Test-Path "plan.txt")) {
    Write-Error "計画ファイルの生成に失敗しました。処理を中断します。"
    exit 1
}

$plan = Get-Content -Path "./plan.txt"
Write-Output "作業計画を生成しました。自律実行ループを開始します。"

# --- 実行ループ：計画 → 実装 → 実行 → 観測 → 自己修正 ---
$tasks = $plan | ForEach-Object { $_ -replace "^\d+\.\s*", "" } # 番号を削除してタスクリスト化

foreach ($task in $tasks) {
    $retryCount = 0
    $taskSuccess = $false

    while (-not $taskSuccess -and $retryCount -lt $MaxRetries) {
        Write-Output "---"
        Write-Output "実行中タスク: $task (試行: $($retryCount + 1))"

        # --- 計画 & 実装 ---
        $implementPrompt = @"
        $Instructions

        現在、以下のタスクを実行しています: '$task'
        このタスクを達成するためのコード変更を生成し、ワークスペースに直接適用してください。
        変更は具体的かつ最小限に留めてください。
        "@

        # CodexCLIを呼び出してコードを実装
        CodexCLI --prompt $implementPrompt --read-workspace --apply-changes

        # --- 実行 & 観測 ---
        Write-Output "実装を適用しました。ビルドとテストを実行します..."
        
        # エラー出力を変数に格納
        $testOutput = . C:\path\to\your\project\scripts\test.ps1 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Output "テスト成功！次のタスクに進みます。"
            $taskSuccess = $true
        } else {
            # --- 自己修正 ---
            $retryCount++
            Write-Warning "テスト失敗。エラーを分析し、自己修正を試みます。"
            $errorLog = $testOutput | Out-String

            $fixPrompt = @"
            $Instructions

            タスク '$task' の実装後、テストを実行したところ失敗しました。
            以下がテスト実行時のエラーログです:
            --- ERROR LOG ---
            $errorLog
            --- END LOG ---

            このエラーを解決するための修正コードを生成し、ワークspaceに直接適用してください。
            エラーの原因を分析し、的確な修正を行ってください。
            "@

            # CodexCLIを呼び出してエラーを修正
            CodexCLI --prompt $fixPrompt --read-workspace --apply-changes
            Write-Output "修正パッチを適用しました。再テストします。"
        }
    }

    if (-not $taskSuccess) {
        Write-Error "タスク '$task' が最大試行回数を超えました。エージェントを停止します。"
        exit 1
    }
}

# --- 完了条件の検証 ---
Write-Output "全てのタスクが完了しました。最終ビルドと検証を行います。"
# ここに最終的なビルドコマンドやREADME更新の指示を追加
# 例: CodexCLI --prompt "プロジェクトをビルドし、配布物を 'dist' フォルダに生成してください。" --apply-changes

Write-Output "✅ 全工程が自律的に完了しました。"