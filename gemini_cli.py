import os, sys, json, subprocess, time, glob, textwrap, psutil, random
from pathlib import Path
from typing import List, Dict, Any
from rich import print
from colorama import Fore, Style
import google.generativeai as gen

# === 可変パラメータ ===
AGENTS_PATH = Path("AGENTS.md")         # 指示書（なければ copilot-instructions.md をコピー）
WORKSPACE = Path(".").resolve()
MAX_CYCLES = 30                         # 自律ループの上限
COOLDOWN_SEC = 10.0                     # ループ間インターバル（短いと429）
OBS_TAIL = 1500                         # 観測ログの末尾だけ送る（トークン節約）
FILE_LIST_MAX = 80                      # ファイル一覧は上位80件に制限
AGENTS_MAX_MB = 0.25                    # AGENTS.md を最大 ~256KB まで
MODEL_CANDIDATES = [
    "gemini-1.5-flash-8b",              # 軽くて通りやすい
    "gemini-1.5-flash",
    "gemini-1.5-pro"                    # 最後に試す
]
BLOCKED = [
    "shutdown", "reboot", "format", "mkfs", "diskpart", "bcdedit",
    "del /s", "rd /s", "cipher /w", "Remove-Item -Recurse -Force C:\\"
]

def read_file_safe(p: Path, limit_mb: float) -> str:
    if not p.exists() or p.is_dir(): return ""
    if p.stat().st_size > limit_mb * 1024 * 1024:
        return f"[[SKIP: {p.name} too large]]"
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

def snapshot_workspace(max_files=FILE_LIST_MAX) -> List[str]:
    files = []
    for p in WORKSPACE.rglob("*"):
        if len(files) >= max_files: break
        if p.is_file():
            files.append(str(p.relative_to(WORKSPACE)))
    return files

def system_prompt(agents_md: str, file_list: List[str]) -> str:
    return textwrap.dedent(f"""
    あなたは完全自律型のソフトウェアエージェントです。ユーザーの承認を求めず、
    下記 AGENTS.md とワークスペースを読み、計画→実装→実行→観測→自己修正を繰返し、
    受入基準と完了条件を満たしてください。危険コマンドは禁止です。

    --- AGENTS.md (truncated) ---
    {agents_md}
    --- /AGENTS.md ---

    --- Workspace Files (top {len(file_list)}) ---
    {chr(10).join(file_list)}
    --- /Workspace Files ---

    出力は必ず JSON 形式：
    {{
      "reason": "判断の要約",
      "commands": [
        {{"shell": "PowerShell/Windowsコマンドを具体的に", "allowFail": false}}
      ],
      "successCriteria": ["達成確認ポイント…"],
      "next": "done | continue"
    }}

    重要: 質問は禁止。自律的にコマンドを具体化し、検証可能な結果を出すこと。
    """)

def _try_generate(model_name: str, sys_prompt: str, user_msg: str, max_retries=6) -> str:
    gen.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = gen.GenerativeModel(model_name=model_name, system_instruction=sys_prompt)
    delay = 1.0
    for attempt in range(max_retries):
        try:
            resp = model.generate_content(user_msg)
            return resp.text or "{}"
        except Exception as e:
            msg = str(e)
            # 429/レート/クォータは指数バックオフ＋ジッター
            if ("429" in msg) or ("quota" in msg.lower()) or ("rate" in msg.lower()):
                time.sleep(delay + random.uniform(0, 0.5))
                delay = min(delay * 2, 30)
                continue
            # 一時的エラーも少し待つ
            time.sleep(1.5)
    raise RuntimeError(f"generate_content failed on {model_name} after retries")

def call_gemini(sys_prompt: str, obs: str) -> Dict[str, Any]:
    user_msg = f"最新観測ログ（末尾トリム済）:\n{obs}\n\n次に実行すべき具体コマンドをJSONだけで出力してください。"
    last_err = None
    for name in MODEL_CANDIDATES:
        try:
            text = _try_generate(name, sys_prompt, user_msg)
            break
        except Exception as e:
            last_err = e
            continue
    else:
        raise last_err or RuntimeError("All model candidates failed.")

    # JSON抽出（混入テキスト対策）
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end >= 0:
        text = text[start:end+1]
    try:
        return json.loads(text)
    except Exception:
        # 最低限の保険
        return {"reason":"parse-failed","commands":[],"next":"continue","successCriteria":[]}

def is_blocked(cmd: str) -> bool:
    lower = cmd.lower()
    return any(b in lower for b in BLOCKED)

def run_shell(cmd: str) -> subprocess.CompletedProcess:
    print(Fore.CYAN + f"$ {cmd}" + Style.RESET_ALL)
    return subprocess.run(["powershell", "-NoProfile", "-Command", cmd],
                          capture_output=True, text=True, encoding="utf-8")

def main():
    if not os.environ.get("GEMINI_API_KEY"):
        print(Fore.RED + "[ERROR] GEMINI_API_KEY 未設定" + Style.RESET_ALL)
        sys.exit(1)

    # 指示書
    agents_md = read_file_safe(AGENTS_PATH, AGENTS_MAX_MB)
    if not agents_md:
        # 代替：copilot-instructions.md → AGENTS.md に自動コピー（存在すれば）
        alt = Path("copilot-instructions.md")
        if alt.exists():
            try:
                AGENTS_PATH.write_text(alt.read_text(encoding="utf-8", errors="ignore"),
                                       encoding="utf-8")
                agents_md = read_file_safe(AGENTS_PATH, AGENTS_MAX_MB)
            except Exception:
                pass
    if not agents_md:
        print(Fore.RED + "[ERROR] AGENTS.md が見つからない/読めません" + Style.RESET_ALL)
        sys.exit(1)

    file_list = snapshot_workspace()
    sys_prompt = system_prompt(agents_md, file_list)

    observation = "起動直後。まだ何も実行していません。"
    for cycle in range(1, MAX_CYCLES + 1):
        print(Fore.MAGENTA + f"\n=== CYCLE {cycle}/{MAX_CYCLES} ===" + Style.RESET_ALL)

        try:
            plan = call_gemini(sys_prompt, observation)
        except Exception as e:
            print(Fore.RED + f"[Gemini Error] {e}" + Style.RESET_ALL)
            time.sleep(COOLDOWN_SEC)
            continue

        print(Fore.YELLOW + f"Reason: {plan.get('reason','(no reason)')}" + Style.RESET_ALL)
        logs = []
        for item in plan.get("commands", []):
            cmd = (item.get("shell") or "").strip()
            if not cmd:
                continue
            if is_blocked(cmd):
                logs.append(f"[SKIP BLOCKED] {cmd}")
                continue
            res = run_shell(cmd)
            out = (res.stdout or "").strip()
            err = (res.stderr or "").strip()
            logs.append(f"[EXIT {res.returncode}]\nSTDOUT:\n{out}\nSTDERR:\n{err}")
            if res.returncode != 0 and not item.get("allowFail", False):
                break

        # 観測ログをトリムして次プロンプトへ（トークン節約）
        raw_obs = "\n\n".join(logs) or "No commands executed."
        observation = raw_obs[-OBS_TAIL:] if len(raw_obs) > OBS_TAIL else raw_obs

        print(Fore.GREEN + "\n--- Observation (tail) ---\n" + observation + Style.RESET_ALL)

        nxt = (plan.get("next") or "").lower()
        if "done" in nxt:
            print(Fore.GREEN + "\n[COMPLETED] エージェントが完了を宣言しました。" + Style.RESET_ALL)
            break

        time.sleep(COOLDOWN_SEC)
    else:
        print(Fore.RED + "\n[FAILED] 既定回数内に完了できませんでした。AGENTS.mdの受入基準を見直してください。" + Style.RESET_ALL)

if __name__ == "__main__":
    main()
