# Summary: 01-03 — Execute: Installer Plumbing

**Status:** ✅ Complete
**Completed:** 2026-03-02 / 2026-03-03 (post-execution fixes)

---

## What Was Built

Full Copilot runtime wiring throughout `bin/install.js`:

### CLI Plumbing
- `--copilot` flag parsed in arg parsing (`hasCopilot`)
- `--all` flag includes `copilot` in all 5 runtimes
- Banner updated: "Claude Code, OpenCode, Gemini, Codex, and Copilot by TÂCHES"
- `--help` output includes `--copilot` flag documentation and example
- `promptRuntime()` includes Copilot as interactive choice

### Core Functions Wired
- `getDirName('copilot')` → `'.copilot'`
- `getGlobalDir('copilot')` → `"'.copilot'"`
- `getConfigDirFromHome('copilot', isGlobal)` → resolves `GH_COPILOT_CONFIG_DIR` > `~/.copilot`
- `install()` — routes to `convertClaudeCommandToCopilotSkill`, `convertClaudeAgentToCopilotAgent`, `installCopilotHooks`
- `finishInstall()` — Copilot success messaging
- `uninstall()` — calls `stripGsdFromCopilotHooks`, removes skill/agent files

### Post-Execution Fixes (2026-03-03)
- Restored 4 separate converter functions (reverted refactor that broke Copilot-only paths)
- Fixed Copilot-only bugs in converter functions
- `metadata`/`short-description` stripping added to `convertClaudeCommandToCopilotSkill`
- Additional test coverage: agent/skill coverage tests, metadata stripping tests

---

## Tests

`tests/copilot-config.test.cjs` — integration test: `install()` for Copilot runtime end-to-end

All tests passing (part of 564 total). Shipped in v1.22.4.

---

## Key Decisions

- Copilot env var is `GH_COPILOT_CONFIG_DIR` (mirrors `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, etc.)
- Skill files installed to `skills/gsd-{name}/SKILL.md` (same structure as Codex)
- Agent files installed to `agents/gsd-{name}.agent.md`
- No statusline installation for Copilot (skipped — no equivalent feature)
- 4 converter functions kept separate (not collapsed) to avoid cross-runtime regressions
