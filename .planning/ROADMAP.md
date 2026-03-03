# GSD Roadmap — get-shit-done-cc

## Project

**Package:** `get-shit-done-cc`
**Primary file:** `bin/install.js`
**Test framework:** `node:test` + `node:assert` (built-in)

---

## Phase 1: Copilot CLI Runtime Integration

**Goal:** Add `copilot` as a fully-supported runtime in the `get-shit-done-cc` installer, with skills, agents, hooks, and full CLI plumbing — at feature parity with the Codex runtime.

**Requirements:**
- COPILOT-01: Core skill conversion — `getCopilotSkillAdapterHeader`, `convertClaudeCommandToCopilotSkill`
- COPILOT-02: Core agent conversion — `convertClaudeAgentToCopilotAgent`
- COPILOT-03: Hooks installation — `installCopilotHooks`, `stripGsdFromCopilotHooks`
- COPILOT-04: Installer plumbing — `getDirName`, `getGlobalDir`, `getConfigDirFromHome`, `install()`, `finishInstall()`, `uninstall()`, `promptRuntime()`, arg parsing, banner, help, `--all`
- COPILOT-05: Tests — `tests/copilot-config.test.cjs` with unit + integration coverage

**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — TDD: Core conversion functions (skill adapter header, skill conversion, agent conversion)
- [ ] 01-02-PLAN.md — TDD: Hooks installation (installCopilotHooks, stripGsdFromCopilotHooks)
- [ ] 01-03-PLAN.md — Execute: Installer plumbing + integration test wiring

**Wave structure:**
- Wave 1 (parallel): Plan 01 and Plan 02 (independent, no shared files at task level)
- Wave 2 (sequential): Plan 03 (depends on functions from 01 + 02)

**Design doc:** `docs/plans/2026-03-02-copilot-runtime-design.md`

**Status:** 🔲 Not started
