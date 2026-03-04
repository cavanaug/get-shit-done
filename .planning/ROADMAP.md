# GSD Roadmap — get-shit-done-cc

## Project

**Package:** `get-shit-done-cc`
**Primary file:** `bin/install.js`
**Test framework:** `node:test` + `node:assert` (built-in)

### Phase 2: model configuration validation and subagent invocation evaluation

**Goal:** Ensure GSD's model profile system (quality/balanced/budget) actually controls which LLM model Copilot CLI subagents use, by injecting `model:` into `.agent.md` frontmatter at install time and adding install-time profile selection.

**Requirements:**
- MODEL-01: resolveModelForCopilot helper + model field injection into convertClaudeAgentToCopilotAgent
- MODEL-02: Install-time profile selection (`--profile` flag + interactive `promptProfile`)
- MODEL-03: Skill adapter Section C update (all invocation patterns, drop model=) + gsd-set-profile warning

**Depends on:** Phase 1
**Plans:** 3 plans

Plans:
- [ ] 02-01-PLAN.md — TDD: resolveModelForCopilot + model injection into .agent.md frontmatter
- [ ] 02-02-PLAN.md — Execute: --profile flag, promptProfile interactive flow, config.json write
- [ ] 02-03-PLAN.md — Execute: getCopilotSkillAdapterHeader Section C rewrite + gsd-set-profile warning

**Wave structure:**
- Wave 1: Plan 02-01 (TDD — core model resolution + injection)
- Wave 2: Plan 02-02 (depends on 02-01 for updated install() signature)
- Wave 3: Plan 02-03 (depends on 02-01 for test file, 02-02 for complete wiring)

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
- [x] 01-01-PLAN.md — TDD: Core conversion functions (skill adapter header, skill conversion, agent conversion)
- [x] 01-02-PLAN.md — TDD: Hooks installation (installCopilotHooks, stripGsdFromCopilotHooks)
- [x] 01-03-PLAN.md — Execute: Installer plumbing + integration test wiring

**Wave structure:**
- Wave 1 (parallel): Plan 01 and Plan 02 (independent, no shared files at task level)
- Wave 2 (sequential): Plan 03 (depends on functions from 01 + 02)

**Design doc:** `docs/plans/2026-03-02-copilot-runtime-design.md`

**Status:** ✅ Complete
