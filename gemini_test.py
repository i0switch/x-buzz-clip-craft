import os
import google.generativeai as gen

# 環境変数からAPIキー取得（必須）
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("環境変数 GEMINI_API_KEY が設定されていません")

print("Using GEMINI_API_KEY suffix:", api_key[-4:])  # 最後の4文字だけ表示

# APIキーを設定
gen.configure(api_key=api_key)

# 軽量モデル（無料枠でも通りやすい）
model = gen.GenerativeModel("gemini-1.5-flash-8b")

try:
    # 実行
    response = model.generate_content("ping")
    print("=== API 呼び出し成功 ===")
    print("応答テキスト:", (response.text or "").strip())
except Exception as e:
    print("=== API 呼び出し失敗 ===")
    print(type(e).__name__, str(e))
