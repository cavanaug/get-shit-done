# Summary: 01-02 — TDD: Hooks Installation

**Status:** ✅ Complete
**Completed:** 2026-03-02

---

## What Was Built

Two hooks management functions in `bin/install.js`:

### `installCopilotHooks(targetDir, isGlobal)`
Installs GSD hooks into a Copilot config directory:
- Copies hook scripts from `hooks/dist/` into `{targetDir}/hooks/` with `.copilot` path templating
- Reads or creates `hooks.json` in `targetDir`
- Registers `sessionStart` and `postToolUse` hooks (camelCase — Copilot CLI spec)
- Hook commands: `node ".copilot/hooks/gsd-check-update.js"` and `node ".copilot/hooks/gsd-context-monitor.js"`
- Uses `getConfigDirFromHome('copilot', isGlobal)` for path templating

### `stripGsdFromCopilotHooks(hooksData)`
Removes GSD entries from a parsed `hooks.json` object:
- Strips GSD hook entries from `sessionStart` and `postToolUse` arrays
- Returns cleaned hooks data (does not write to disk)
- Used during uninstall

---

## Tests

`tests/copilot-config.test.cjs` — suites: `installCopilotHooks`, `stripGsdFromCopilotHooks`

All tests passing (part of 564 total).

---

## Key Decisions

- Copilot uses `hooks.json` (not `settings.json` like Claude, not `.codexrc` like Codex)
- Event names are camelCase: `sessionStart`, `postToolUse` (Copilot CLI spec)
- No statusline hook wired (Copilot CLI has no statusline equivalent)
- Hook scripts use `.copilot` path prefix (not `.claude` or `.codex`)
