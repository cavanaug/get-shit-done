# PROJECT: get-shit-done-cc

**Package:** `get-shit-done-cc`
**Repo:** github.com/cavanaug/get-shit-done (fork of gsd-build/get-shit-done)
**Branch:** `copilot_cli`
**Primary file:** `bin/install.js`
**Test framework:** `node:test` + `node:assert` (built-in)

---

## What This Is

`get-shit-done-cc` is the installer package for the GSD (Get Shit Done) AI-native development workflow system. It installs GSD commands, agents, skills, and hooks into AI coding assistant runtimes (Claude Code, OpenCode, Gemini, Codex, Copilot CLI).

The `copilot_cli` branch adds GitHub Copilot CLI as a fully-supported runtime, at feature parity with the existing Codex runtime.

---

## Core Value

A single `npx get-shit-done-cc --copilot --global` command installs the complete GSD workflow system into GitHub Copilot CLI — converting Claude Code slash-commands into Copilot SKILL.md files, converting agents into `.agent.md` files, and wiring GSD hooks into `hooks.json`.

---

## Requirements

- **COPILOT-01:** Core skill conversion — `getCopilotSkillAdapterHeader`, `convertClaudeCommandToCopilotSkill`
- **COPILOT-02:** Core agent conversion — `convertClaudeAgentToCopilotAgent`
- **COPILOT-03:** Hooks installation — `installCopilotHooks`, `stripGsdFromCopilotHooks`
- **COPILOT-04:** Installer plumbing — `getDirName`, `getGlobalDir`, `getConfigDirFromHome`, `install()`, `finishInstall()`, `uninstall()`, `promptRuntime()`, arg parsing, banner, help, `--all`
- **COPILOT-05:** Tests — `tests/copilot-config.test.cjs` with unit + integration coverage

---

## Architecture

```
bin/install.js              — Main installer (all runtimes)
tests/copilot-config.test.cjs — Copilot-specific tests
hooks/                      — Hook scripts (copied to .copilot/hooks/)
agents/                     — Agent source files (converted to .agent.md)
commands/                   — Slash-command source files (converted to SKILL.md)
```

**Copilot install target:** `~/.copilot/` (or `GH_COPILOT_CONFIG_DIR`)

**Copilot file layout after install:**
```
~/.copilot/
  skills/gsd-*/SKILL.md     — Converted slash-commands
  agents/gsd-*.agent.md     — Converted agents
  hooks/gsd-*.js            — Hook scripts
  hooks.json                — Hook registration
```

---

## Design Doc

`docs/plans/2026-03-02-copilot-runtime-design.md`
