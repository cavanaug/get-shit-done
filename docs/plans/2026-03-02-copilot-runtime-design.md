# Copilot CLI Runtime Integration — Design Doc

**Date:** 2026-03-02  
**Approach:** Full Parity (Approach B) — Skills + Hooks + Agents  
**Target depth:** Same as Codex runtime

---

## Overview

Add `copilot` as a new runtime to the `get-shit-done-cc` installer (`bin/install.js`). When installed, GSD populates `~/.copilot/` (global) or `.copilot/` (local) with:

- **Skills** — GSD slash commands as `skills/gsd-*/SKILL.md`
- **Agents** — GSD agent prompts as `agents/gsd-*.agent.md`
- **Hooks** — Update check + context monitor wired via `hooks.json`
- **Core files** — `get-shit-done/`, `VERSION`, `CHANGELOG.md`, `package.json`

---

## Architecture

```
~/.copilot/
├── skills/
│   ├── gsd-new-project/SKILL.md
│   ├── gsd-plan-phase/SKILL.md
│   ├── gsd-execute-phase/SKILL.md
│   └── ... (one dir per command)
├── agents/
│   ├── gsd-executor.agent.md
│   ├── gsd-planner.agent.md
│   └── ... (one file per agent)
├── hooks/
│   ├── gsd-check-update.js        (bundled, templated)
│   └── gsd-context-monitor.js     (bundled, templated)
├── hooks.json                     (created/merged)
├── get-shit-done/                 (GSD workflow system)
├── package.json                   ({"type":"commonjs"})
└── MANIFEST.gsd
```

No `config.toml` or `settings.json` — Copilot uses `hooks.json` exclusively for hook registration, and has no agent registry config file.

---

## Component 1: Skills

### File format

Identical to Codex: `skills/<skill-name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: "gsd-plan-phase"
description: "Plan a phase..."
metadata:
  short-description: "Plan a phase..."
---
```

### Reuse `copyCommandsAsCodexSkills()`

The existing function already writes the correct directory structure. It takes a `runtime` parameter; when `runtime === 'copilot'`, use `convertClaudeCommandToCopilotSkill()` instead of `convertClaudeCommandToCodexSkill()`.

### New: `getCopilotSkillAdapterHeader(skillName)`

Mirrors `getCodexSkillAdapterHeader()`. Three sections:

**A. Skill Invocation**
- Invoked by mentioning `/<skillName>` in the prompt (e.g. `/gsd-plan-phase`)
- Text after the skill name is treated as `{{GSD_ARGS}}`

**B. AskUserQuestion mapping**
- No native `request_user_input` tool in Copilot
- Present as interactive numbered list; user types their selection
- In non-interactive/autopilot mode: pick the most reasonable default and proceed
- Multi-select: present comma-separated entry request

**C. Task() → fleet mapping**
- No programmatic `spawn_agent` API
- `Task(subagent_type="X", prompt="Y")` → prefix the prompt with `/fleet` to spawn parallel subagents, or describe work to a single subagent inline
- Serial subagent work: run as a new `copilot` subprocess or use `@agent-name` mention
- Parallel fan-out: use `/fleet` — orchestrator manages lifecycle automatically
- No `close_agent()` needed — fleet manages cleanup

### New: `convertClaudeCommandToCopilotSkill(content, skillName)`

Same signature as `convertClaudeCommandToCodexSkill()`:
1. Apply `convertClaudeToCopilotMarkdown()` (path replacement + `$ARGUMENTS` → `{{GSD_ARGS}}`, `/gsd:cmd` → `/gsd-cmd`)
2. Extract frontmatter description
3. Prepend `getCopilotSkillAdapterHeader(skillName)`
4. Return full SKILL.md content

---

## Component 2: Agents

### File format

Copilot uses `.agent.md` files (not `.md` + `.toml` pairs like Codex):

```markdown
---
name: gsd-executor
description: Executes GSD plans with atomic commits, deviation handling, and state management.
tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
user-invocable: false
---

<copilot_agent_role>
role: gsd-executor
purpose: Executes GSD plans with atomic commits, deviation handling, and state management.
</copilot_agent_role>

[body from source agent .md]
```

Differences from Claude source format:
- `color` field dropped
- `tools` becomes a JSON array string (not comma-separated)
- `user-invocable: false` added
- `<copilot_agent_role>` header injected at start of body

### New: `convertClaudeAgentToCopilotAgent(content)`

Mirrors `convertClaudeAgentToCodexAgent()`:
1. Apply `convertClaudeToCodexMarkdown()` for path/slash-command replacement
2. Parse frontmatter: extract `name`, `description`, `tools`
3. Rebuild frontmatter with only `name`, `description`, `tools` (as JSON array), `user-invocable: false`
4. Inject `<copilot_agent_role>` block at start of body
5. Return converted content

### Install path

Files written as `agents/gsd-<name>.agent.md` (not `gsd-<name>.md`).

In `install()`, the agents loop gets an `isCopilot` branch:
```js
} else if (isCopilot) {
  content = convertClaudeAgentToCopilotAgent(content);
  // Write as .agent.md
  const agentMdName = entry.name.replace('.md', '.agent.md');
  fs.writeFileSync(path.join(agentsDest, agentMdName), content);
}
```

### Uninstall

Remove files matching `gsd-*.agent.md` from `agents/` (in addition to `gsd-*.md` pattern already used by other runtimes).

---

## Component 3: Hooks

### File format

Copilot uses `hooks.json` (not `settings.json`):

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": "node \"/path/to/hooks/gsd-check-update.js\"",
        "timeoutSec": 30
      }
    ],
    "postToolUse": [
      {
        "type": "command",
        "bash": "node \"/path/to/hooks/gsd-context-monitor.js\"",
        "timeoutSec": 30
      }
    ]
  }
}
```

Hook event name casing: `sessionStart` and `postToolUse` (camelCase, per Copilot CLI docs).

### Skipped: `gsd-statusline.js`

Copilot CLI has no statusline equivalent. Skip entirely.

### New: `installCopilotHooks(targetDir, isGlobal)`

1. Copy hook JS scripts from `hooks/dist/` to `targetDir/hooks/` (same as other runtimes — templating `'.copilot'` path)
2. Build command strings:
   - Global: `node "/absolute/path/to/hooks/gsd-check-update.js"`
   - Local: `node ".copilot/hooks/gsd-check-update.js"`
3. Read existing `hooks.json` if present (parse JSON, default to `{ version: 1, hooks: {} }`)
4. Idempotent merge: check for existing `gsd-check-update` / `gsd-context-monitor` entries before adding
5. Write updated `hooks.json`

### Uninstall

Strip GSD entries from `hooks.json` (filter out entries whose `bash` contains `gsd-check-update` or `gsd-context-monitor`). If `hooks.json` becomes empty, delete it.

---

## Component 4: Installer Plumbing (`bin/install.js`)

### Arg parsing (top of file)

```js
const hasCopilot = args.includes('--copilot');
// ...
if (hasAll) {
  selectedRuntimes = ['claude', 'opencode', 'gemini', 'codex', 'copilot'];
}
if (hasCopilot) selectedRuntimes.push('copilot');
```

### `getDirName(runtime)`

```js
if (runtime === 'copilot') return '.copilot';
```

### `getGlobalDir(runtime, explicitDir)`

```js
if (runtime === 'copilot') {
  if (explicitDir) return expandTilde(explicitDir);
  if (process.env.GH_COPILOT_CONFIG_DIR) return expandTilde(process.env.GH_COPILOT_CONFIG_DIR);
  return path.join(os.homedir(), '.copilot');
}
```

### `getConfigDirFromHome(runtime, isGlobal)`

```js
if (runtime === 'copilot') return "'.copilot'";
```

### `install()` function

Add `isCopilot` flag. Branch the skills, agents, and hooks sections:

- **Skills:** same path as Codex (`skills/gsd-*/SKILL.md`) but call `convertClaudeCommandToCopilotSkill()`
- **Agents:** write `.agent.md` format via `convertClaudeAgentToCopilotAgent()`
- **Hooks:** call `installCopilotHooks()` instead of writing to `settings.json`
- **`package.json`:** write CommonJS marker (same as Claude/Gemini/OpenCode — hooks are Node.js scripts)
- **No `config.toml`:** skip the `installCodexConfig()` call entirely

### `finishInstall()`

```js
if (runtime === 'copilot') program = 'Copilot';
// ...
if (runtime === 'copilot') command = '/gsd-new-project';
// No statusline for copilot — skip handleStatusline
```

### `uninstall()` function

Add `isCopilot` branch:
- Skills: remove `skills/gsd-*/` dirs (same as Codex)
- Agents: remove `agents/gsd-*.agent.md` files
- Hooks: strip GSD entries from `hooks.json`
- No `config.toml`, no `settings.json` cleanup needed

### Banner + help text

Update to mention Copilot in runtime list and add CLI examples:
```
npx get-shit-done-cc --copilot --global
```

### Interactive prompt (`promptRuntime`)

Add option `6) Copilot (~/.copilot)` and update choice `5 → All` (was `5`).

### `GSD_TEST_MODE` exports

Add new Copilot functions to the `module.exports` block:
- `getCopilotSkillAdapterHeader`
- `convertClaudeAgentToCopilotAgent`
- `installCopilotHooks`
- `convertClaudeCommandToCopilotSkill`

---

## Component 5: Tests (`tests/copilot-config.test.cjs`)

New test file mirroring `codex-config.test.cjs`. Test suites:

| Suite | Behaviors |
|---|---|
| `getCopilotSkillAdapterHeader` | All three sections present, `$skillName` invocation, `{{GSD_ARGS}}`, AskUserQuestion → interactive list, Task → `/fleet` mapping |
| `convertClaudeAgentToCopilotAgent` | Correct frontmatter output, `<copilot_agent_role>` header, `color` dropped, `tools` as JSON array, `user-invocable: false`, slash command conversion, no-frontmatter passthrough |
| `installCopilotHooks` | `hooks.json` created, correct `sessionStart` + `postToolUse` entries, idempotent merge, merge into existing `hooks.json`, global vs local path |
| Integration: full skills install | Skills dir populated with `gsd-*/SKILL.md`, correct adapter header, path replacement |
| Integration: full agent install | `agents/gsd-*.agent.md` files written |

---

## What Is NOT Changing

- `commands/gsd/*.md` source files — unchanged (single source of truth)
- `agents/*.md` source files — unchanged
- `hooks/dist/*.js` hook scripts — unchanged (reused as-is)
- `get-shit-done/` workflow system — unchanged
- All other runtimes (Claude, OpenCode, Gemini, Codex) — no behavioral changes

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Reuse `copyCommandsAsCodexSkills()` | Copilot skill structure is identical to Codex |
| New `getCopilotSkillAdapterHeader()` | AskUserQuestion and Task() map differently (no `request_user_input`, no `spawn_agent`) |
| `.agent.md` extension | Copilot's native agent file format |
| `hooks.json` (not `settings.json`) | Copilot's hook registration mechanism |
| Skip `gsd-statusline.js` | No statusline equivalent in Copilot CLI |
| `GH_COPILOT_CONFIG_DIR` env var | Mirrors pattern of other runtimes; reasonable convention |
| Copilot added to `--all` | Parity with all other runtimes |
