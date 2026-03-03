# GSD State

**Last updated:** 2026-03-02
**Current phase:** 01-copilot-runtime
**Status:** Phase complete ✅

---

## Position

Phase 01 (Copilot runtime integration) is complete. All 3 plans executed, all tests pass (488/488).

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
| copyCommandsAsCodexSkills dispatch | Runtime-aware: copilot → convertClaudeCommandToCopilotSkill | Bug found via integration test |

---

## Completed

- [x] Execute Plan 01 (Wave 1): Core conversion functions — TDD (`511022a`, `da5f313`)
- [x] Execute Plan 02 (Wave 1): Hooks installation — TDD (`f982da0`, `ed23af3`)
- [x] Execute Plan 03 (Wave 2): Installer plumbing + integration (`74bcc19`, `4dd8c6b`)

---

## Blockers

None.

---

## History

- 2026-03-02: Design doc `docs/plans/2026-03-02-copilot-runtime-design.md` approved and committed
- 2026-03-02: Planning complete — 3 PLAN.md files written to `.planning/phases/01-copilot-runtime/`
- 2026-03-02: Plans 01-01, 01-02, 01-03 executed — Copilot runtime fully integrated
- 2026-03-02: 488 tests pass, 0 failures
