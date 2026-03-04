# GSD State

**Last updated:** 2026-03-04
**Current phase:** 01-copilot-runtime
**Status:** Phase 1 complete — all plans executed, all tests passing

---

## Position

Phase 1 (Copilot runtime integration) is complete. All 3 PLAN.md files were executed. Copilot is now a fully-supported runtime in the installer at feature parity with Codex. 564 tests pass (0 failures).

---

## Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Copilot dir name | `.copilot` | Matches Copilot CLI convention |
| Copilot global dir env var | `GH_COPILOT_CONFIG_DIR` | Mirrors other runtime env var pattern |
| Skill format | `skills/gsd-*/SKILL.md` (identical to Codex) | Reuse `copyCommandsAsCodexSkills()` |
| Agent format | `agents/gsd-*.agent.md` | Copilot's native `.agent.md` extension |
| Hook registration | `hooks.json` (not `settings.json`) | Copilot CLI's mechanism |
| Hook event names | `sessionStart`, `postToolUse` (camelCase) | Copilot CLI spec |
| Skip statusline | Yes | No statusline equivalent in Copilot CLI |
| `--all` flag | Adds copilot to all 5 runtimes | Parity |
| Skill adapter header tag | `<copilot_skill_adapter>` | Mirrors Codex `<codex_skill_adapter>` |
| Section C title | `## C. Task() → /fleet` | Maps to Copilot fleet, not `spawn_agent` |
| Agent tools field | JSON array `["Read", "Write"]` | Copilot YAML spec requires array |
| `user-invocable: false` in agent FM | Yes | Copilot `.agent.md` spec |
| TDD approach | Plans 01 + 02 are type: tdd | Functions have clear I/O contracts |

---

## Pending

None. Phase 1 is complete.

---

## Blockers

None.

---

## History

- 2026-03-02: Design doc `docs/plans/2026-03-02-copilot-runtime-design.md` approved and committed
- 2026-03-02: Planning complete — 3 PLAN.md files written to `.planning/phases/01-copilot-runtime/`
- 2026-03-02: Plan 01 (01-01) executed — `getCopilotSkillAdapterHeader`, `convertClaudeCommandToCopilotSkill`, `convertClaudeAgentToCopilotAgent` implemented with TDD
- 2026-03-02: Plan 02 (01-02) executed — `installCopilotHooks`, `stripGsdFromCopilotHooks` implemented with TDD
- 2026-03-02: Plan 03 (01-03) executed — Installer plumbing wired: arg parsing, getDirName, getGlobalDir, getConfigDirFromHome, install(), finishInstall(), uninstall(), promptRuntime(), banner, help, --all
- 2026-03-03: Post-execution fixes — metadata/short-description stripping, 4 converter functions restored, Copilot-only bugs resolved
- 2026-03-03: Phase 1 fully complete — 564 tests passing, shipped as v1.22.4

### Roadmap Evolution

- Phase 2 added: model configuration validation and subagent invocation evaluation
