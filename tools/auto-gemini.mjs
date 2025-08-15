// tools/auto-gemini.mjs
import fs from "fs";
import path from "path";
import process from "process";
import { spawn } from "child_process";
import chalk from "chalk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ====== 1. 設定 (Configuration) ======
const MAX_HISTORY_TURNS = 10; // 記憶しておく会話の往復数 (2 * 10 = 20件)

// AIへの指示を強化。「思考(thought)」と「完了(finish)」を必須に。
const SYSTEM_PROMPT = `あなたは完全自律型のコーディングエージェントです。ユーザーの指示(briefing)と履歴に基づき、具体的なアクションを一つずつ計画してください。
各アクションには、その理由を説明する'thought'フィールドを必ず含めてください。
タスクが完了したと判断した場合は、'finish'アクションを返してください。
応答はJSON形式でお願いします。`;

const jsonExample = `\`\`\`json
[
  {
    "thought": "まず、プロジェクトの依存関係をインストールする必要がある。",
    "action": "run_shell_command",
    "command": "npm install"
  }
]
\`\`\` or \`\`\`json
[
  {
    "thought": "指示書の要件をすべて満たしたため、タスクは完了です。",
    "action": "finish",
    "reason": "すべての機能の実装とテストファイルの作成が完了しました。"
  }
]
\`\`\``;

// ====== 2. 環境変数・パラメータ取得 (Environment & Parameters) ======
const apiKey = process.env.GOOGLE_API_KEY;
const briefingPath = process.env.GEMINI_BRIEFING_PATH;
const maxSteps = Number(process.env.GEMINI_MAX_STEPS || 15);

if (!apiKey || !briefingPath) {
  console.error(chalk.red("❌ GOOGLE_API_KEY または指示書のパスが設定されていません。gemini-auto.ps1から起動してください。"));
  process.exit(1);
}

// ====== 3. Geminiモデルと会話履歴の初期化 (Initialization) ======
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
const conversationHistory = [];


// ====== 4. ヘルパー関数 (Helper Functions) ======

/**
 * 安全なコマンド実行 (exec → spawnに変更)
 * @param {string} command - 実行するコマンド
 * @returns {Promise<string>} - 成功時の標準出力
 */
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`🚀 シェルコマンド実行: ${command}`));
    const child = spawn(command, { shell: true, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      process.stdout.write(chalk.gray(data.toString()));
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(chalk.red(data.toString()));
      stderr += data.toString();
    });
    child.on('error', (err) => reject(new Error(`Spawnエラー: ${err.message}`)));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`コマンドがエラーコード ${code} で終了しました。\nSTDERR: ${stderr.trim()}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * 堅牢なJSON抽出 (複数ブロックやゴミがあっても対応)
 * @param {string} text - AIからの応答テキスト
 * @returns {object[]} - パースされたアクションの配列
 */
function extractJsonActions(text) {
    const matches = [...text.matchAll(/```json\s*([\s\S]*?)\s*```/g)];
    if (!matches.length) throw new Error("応答からJSONコードブロックが見つかりませんでした。");
    
    let actions;
    for (const [, block] of matches) {
      try {
        actions = JSON.parse(block);
        if (Array.isArray(actions)) {
           return actions; // 最初に成功した有効な配列を返す
        }
      } catch {}
    }
    throw new Error("応答から有効なJSONアクション配列を抽出できませんでした。");
}


// ====== 5. メインループ (Main Loop) ======
async function main() {
  const briefing = fs.readFileSync(briefingPath, "utf-8");
  
  // 最初のプロンプト
  const initialPrompt = `これがあなたの任務を記述した仕様書（briefing）です。\n\n--- BRIEFING ---\n${briefing}\n\n--- END BRIEFING ---\n\n最初のステップとして、プロジェクトのセットアップ（必要なファイルの作成や依存関係のインストールなど）から始めてください。あなたの応答は、実行すべきアクションを記述したJSON形式である必要があります。例:\n${jsonExample}`;
  conversationHistory.push({ role: 'user', parts: [{ text: initialPrompt }] });

  for (let i = 1; i <= maxSteps; i++) {
    console.log(chalk.cyan(`\n============ 🤖 AUTONOMOUS STEP ${i}/${maxSteps} ============`));
    
    try {
      // 会話履歴が長くなりすぎないように調整 (最初の指示 + 直近のやり取り)
      const historyToSend = conversationHistory.length > (MAX_HISTORY_TURNS * 2)
        ? [conversationHistory[0], ...conversationHistory.slice(-MAX_HISTORY_TURNS * 2)]
        : conversationHistory;

      const chat = model.startChat({ history: historyToSend });
      const lastMessage = conversationHistory[conversationHistory.length - 1].parts[0].text;
      
      console.log(chalk.gray("🧠 Geminiに思考をリクエスト中..."));
      const result = await chat.sendMessage(lastMessage);
      const responseText = result.response.text();
      conversationHistory.push({ role: 'model', parts: [{ text: responseText }] });

      const actions = extractJsonActions(responseText);
      const stepResults = [];

      for (const action of actions) {
        console.log(chalk.yellow(`🤔 思考: ${action.thought || 'なし'}`));

        if (action.action === "finish") {
            console.log(chalk.green(`\n🎉 AIがタスク完了を宣言しました: ${action.reason || '理由なし'}`));
            process.exit(0); // 正常終了
        }
        
        try {
            if (action.action === "write_file") {
                console.log(chalk.blue(`📝 ファイル書き込み: ${action.file_path}`));
                fs.mkdirSync(path.dirname(action.file_path), { recursive: true });
                fs.writeFileSync(action.file_path, action.content, "utf-8");
            } else if (action.action === "run_shell_command") {
                await runCommand(action.command);
            }
            stepResults.push({ action: action, success: true });
        } catch (err) {
            stepResults.push({ action: action, success: false, error: err.message });
        }
      }
      
      const successfulActions = stepResults.filter(r => r.success);
      const failedActions = stepResults.filter(r => !r.success);
      let nextPrompt = ``;

      if (failedActions.length > 0) {
        nextPrompt = `前のステップでいくつかのタスクに失敗しました。\n\n成功したタスク:\n${successfulActions.map(r => `- ${r.action.action}: ${r.action.command || r.action.file_path}`).join('\n') || 'なし'}\n\n失敗したタスクとエラー:\n${failedActions.map(r => `- ${r.action.action} (${r.action.command || r.action.file_path}): ${r.error}`).join('\n')}\n\nエラーを分析し、失敗したタスクを修正・再試行するための新しいアクションプランを提案してください。成功したタスクを繰り返す必要はありません。`;
      } else {
        nextPrompt = `前のステップはすべて成功しました。仕様書(briefing)とこれまでの履歴に基づき、次の論理的なステップに進んでください。`;
      }
      conversationHistory.push({ role: 'user', parts: [{ text: nextPrompt }] });

    } catch (e) {
      console.error(chalk.red(`\n🔥 ステップ ${i} で致命的なエラーが発生しました: ${e.message}`));
      const errorPrompt = `❌ 致命的なエラーが発生しました:\n${e.message}\n\nこのエラーを分析し、問題を解決するための新しいアクションプランをJSON形式で提案してください。`;
      conversationHistory.push({ role: 'user', parts: [{ text: errorPrompt }] });
    }
  }
  console.log(chalk.magenta("\n🏁 最大ステップ数に到達しました。エージェントの実行を終了します。"));
}

main();