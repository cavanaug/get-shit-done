# Summary: 01-01 — TDD: Core Conversion Functions

**Status:** ✅ Complete
**Completed:** 2026-03-02

---

## What Was Built

Three core conversion functions in `bin/install.js`:

### `getCopilotSkillAdapterHeader(skillName)`
Generates the `<copilot_skill_adapter>` XML block prepended to every Copilot SKILL.md. Contains three sections:
- **A. Skill Invocation** — `/gsd-{skillName}` syntax and `{{GSD_ARGS}}` variable
- **B. AskUserQuestion** — numbered interactive list fallback (no `request_user_input`), autopilot default, comma-separated multi-select
- **C. Task() → /fleet** — maps GSD `Task(...)` to `/fleet` for parallel fan-out, `@agent-name` for serial, no `close_agent()` needed

### `convertClaudeCommandToCopilotSkill(content, skillName)`
Converts Claude Code slash-command markdown to Copilot SKILL.md format:
- Applies `convertClaudeToCopilotMarkdown()` (base conversions)
- Prepends Copilot adapter header
- Strips `metadata`/`short-description` frontmatter fields (Copilot doesn't use them)

### `convertClaudeAgentToCopilotAgent(content)`
Converts Claude Code agent markdown to Copilot `.agent.md` format:
- Applies base markdown conversions
- Rewrites frontmatter: `tools` → JSON array, adds `user-invocable: false`
- Prepends `<copilot_agent_role>` block with `role` and `purpose` fields

---

## Tests

`tests/copilot-config.test.cjs` — suites: `getCopilotSkillAdapterHeader`, `convertClaudeCommandToCopilotSkill`, `convertClaudeAgentToCopilotAgent`

All tests passing (part of 564 total).

---

## Key Decisions

- Adapter header uses `<copilot_skill_adapter>` tag (mirrors `<codex_skill_adapter>`)
- Section C title is `## C. Task() → /fleet` (maps to Copilot fleet)
- `metadata` and `short-description` frontmatter fields are stripped (not valid in Copilot)
- Agent `tools` field must be JSON array (Copilot YAML spec requirement)
