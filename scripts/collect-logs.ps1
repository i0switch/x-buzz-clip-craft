# ログ収集ZIP化
Write-Host "[Logs] ログ収集..."
Compress-Archive -Path ./logs/* -DestinationPath ./logs.zip -Force
Write-Host "[Logs] 完了: logs.zip"
