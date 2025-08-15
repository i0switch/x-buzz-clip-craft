# -----------------------------------------------------------------------------
# Gemini 自律エージェント制御ループ スクリプト
#
# 機能:
# 1. plan.json を読み込み、タスクを順次実行する
# 2. コマンド実行またはGeminiによるコード生成を行う
# 3. エラー発生時、エラー内容をGeminiに送り、新しい計画を生成して続行する
# 4. plan.json が空になったら処理を完了する
#
# 使い方:
# 1. 最初の計画を`plan.json`として生成する
# 2. PowerShellで `./agent_loop.ps1` を実行する
# -----------------------------------------------------------------------------

# --- 初期設定 ---

# 各ファイルのパス
$planPath = "./plan.json"
$instructionsPath = "./copilot-instructions.md"
$workspaceStatePath = "./workspace_state.txt"

# スクリプト内でエラーが発生した場合、即座に停止してcatchブロックに移行する
$ErrorActionPreference = "Stop"

# --- メインループ ---

Write-Output "自律エージェントを開始します。終了するには Ctrl+C を押してください。"

while ($true) {
    # --- 1. 計画の確認と完了判定 ---
    if (-not (Test-Path $planPath)) {
        Write-Warning "計画ファイル ($planPath) が見つかりません。処理を終了します。"
        break
    }

    # plan.jsonを読み込む
    $planJson = Get-Content $planPath -Raw
    if ([string]::IsNullOrWhiteSpace($planJson)) {
         Write-Host "計画は空です。全てのタスクが完了しました。"
         # 必要に応じて最終テストなどを実行
         if(Test-Path "scripts/test.ps1") {
            Write-Output "最終テストを実行します..."
            try {
                Invoke-Expression "scripts/test.ps1"
                Write-Host "テスト成功！" -ForegroundColor Green
            } catch {
                Write-Error "最終テストでエラーが発生しました: $($_.Exception.Message)"
            }
         }
         break
    }
    
    $plan = $planJson | ConvertFrom-Json

    if ($plan.Count -eq 0) {
        Remove-Item $planPath # 空になった計画ファイルを削除
        continue # ループの先頭に戻り、完了メッセージを表示して終了
    }

    # --- 2. ステップの取得と計画の更新 ---
    $step = $plan[0]
    $remainingPlan = $plan | Select-Object -Skip 1

    # 残りの計画を即座にファイルに書き戻す（進捗の保存）
    $remainingPlan | ConvertTo-Json -Depth 5 | Set-Content $planPath

    # --- 3. ステップの実行 ---
    try {
        $stepType = $step.type
        $payload = $step.payload
        
        Write-Output "--------------------------------------------------"
        Write-Host "▶ 実行中 [ $($stepType) ]" -ForegroundColor Cyan
        Write-Output "   詳細: $($payload | ConvertTo-Json -Compress -Depth 3)"
        Write-Output "--------------------------------------------------"

        switch ($stepType) {
            "execute_command" {
                Invoke-Expression $payload
                Write-Host "✅ コマンド成功" -ForegroundColor Green
            }
            "generate_code" {
                $prompt = $payload.prompt
                $file = $payload.file
                Write-Output "   Geminiにコード生成を依頼中..."
                # Gemini CLI を呼び出し、結果を直接ファイルに保存
                gemini -p $prompt | Set-Content $file -NoNewline
                Write-Host "✅ コード生成成功: $file" -ForegroundColor Green
            }
            default {
                Write-Warning "未定義のステップタイプです: $stepType"
            }
        }

    } catch {
        # --- 4. エラー発生時の自己修正 ---
        $errorMessage = $_.Exception.Message
        $failedStepJson = $step | ConvertTo-Json -Depth 5

        Write-Error "❌ エラーが発生しました: $errorMessage"
        Write-Output "   自己修正のため、Geminiに新しい計画を問い合わせます..."

        # エラー情報とコンテキストをGeminiに渡し、修正計画を生成させる
        $correctionPrompt = @"
あなたは完全自律型ソフトウェアエージェントです。
タスク実行中に以下のエラーが発生しました。原因を分析し、この問題を解決して最終目標を達成するための、新しい完全な行動計画をJSON配列形式で再生成してください。

# 元の指示書
$(Get-Content $instructionsPath -Raw)

# 失敗したステップ
$failedStepJson

# エラーメッセージ
$errorMessage

# 現状のワークスペース
$(tree /F)

# 命令
上記のエラーを解決し、タスクを完遂するための新しい行動計画をJSON配列として出力してください。
"@

        # Geminiに修正計画を問い合わせ、plan.jsonを上書き
        gemini -p $correctionPrompt | Set-Content $planPath -NoNewline

        Write-Host "新しい計画を生成しました。処理を継続します。" -ForegroundColor Yellow
    }

    # サーバーへの負荷を考慮し、少し待機する
    Start-Sleep -Seconds 2
}

Write-Output "自律エージェントの処理がすべて完了しました。"