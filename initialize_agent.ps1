# -----------------------------------------------------------------------------
# Gemini Autonomous Agent Initializer Script
#
# Function:
# 1. Runs 'tree' command to save the current file structure to 'workspace_state.txt'
# 2. Combines instructions and file structure to create a master prompt
# 3. Sends the master prompt to Gemini to generate the initial plan 'plan.json'
#
# Prerequisites:
# - 'copilot-instructions.md' must exist in the same directory.
# - 'tree' and 'gemini' commands must be executable.
#
# Usage:
# - Run './initialize_agent.ps1' in PowerShell.
# -----------------------------------------------------------------------------

# --- Configuration ---
$instructionsPath = "./copilot-instructions.md"
$workspaceStatePath = "./workspace_state.txt"
$planPath = "./plan.json"

# --- Step 1: Get Workspace State ---
Write-Host "▶ Step 1: Getting workspace state..." -ForegroundColor Cyan
try {
    # Execute 'tree /F' and output the result to a file
    tree /F | Out-File -FilePath $workspaceStatePath -Encoding utf8
    Write-Host "✅ Workspace state saved to '$workspaceStatePath'." -ForegroundColor Green
} catch {
    Write-Error "❌ Error executing 'tree' command. Please ensure it is in your system's PATH."
    # Exit the script on error
    exit 1
}

# --- Step 2: Create Master Prompt ---
Write-Host "▶ Step 2: Creating master prompt for Gemini..." -ForegroundColor Cyan

# Read the instructions and workspace state
if (-not (Test-Path $instructionsPath)) {
    Write-Error "❌ Instruction file not found: '$instructionsPath'"
    exit 1
}
$instructionsContent = Get-Content $instructionsPath -Raw
$workspaceStateContent = Get-Content $workspaceStatePath -Raw

# Assemble the master prompt using a PowerShell here-string
$masterPrompt = @"
You are a fully autonomous software agent. Without asking for user permission, complete the task based on the following instructions and the current workspace state.

# Instructions
$instructionsContent

# Current Workspace
$workspaceStateContent

# Command
Based on the information above, output a concrete series of steps to complete the task as a JSON array. Each step must include a 'type' ('execute_command' or 'generate_code') and a 'payload' (the details of the command to execute or the code to generate).

Example:
[
  { "type": "execute_command", "payload": "pip install beautifulsoup4 selenium" },
  { "type": "generate_code", "payload": { "prompt": "Create a Python function that scrapes an X post. It should take a URL as an argument and return the post's body text.", "file": "src/scraper.py" } },
  { "type": "execute_command", "payload": "python -m unittest discover tests" }
]
"@

Write-Host "✅ Master prompt created successfully." -ForegroundColor Green

# --- Step 3: Query Gemini for the Plan ---
Write-Host "▶ Step 3: Querying Gemini for the initial plan... (this may take a moment)" -ForegroundColor Cyan
try {
    # Pass the master prompt to Gemini and save the result to 'plan.json'
    gemini -p $masterPrompt | Set-Content $planPath -NoNewline
    Write-Host "--------------------------------------------------" -ForegroundColor Yellow
    Write-Host "🎉 Initial plan 'plan.json' has been created successfully." -ForegroundColor Yellow
    Write-Host "Next, run './agent_loop.ps1' to start the autonomous task." -ForegroundColor Yellow
    Write-Host "--------------------------------------------------" -ForegroundColor Yellow
} catch {
    Write-Error "❌ Error executing 'gemini' command. Please ensure it is installed and you are authenticated."
    exit 1
}