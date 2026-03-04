# Research: Phase 2 — Model Configuration Validation and Subagent Invocation Evaluation

**Status:** RESEARCH COMPLETE
**Date:** 2026-03-04

---

## Summary

A **critical silent failure** exists in the Copilot CLI runtime: the GSD model profile system (`quality`/`balanced`/`budget` → opus/sonnet/haiku per agent type) is completely disconnected from Copilot CLI's actual subagent model selection. When GSD skills spawn subagents via `/fleet`, those subagents run on **Copilot's default low-cost model** — regardless of what `model_profile` is set in `config.json`. The `model:` frontmatter field in `.agent.md` IS the official mechanism to fix this (confirmed by Copilot docs), but the current `convertClaudeAgentToCopilotAgent` function never injects it. This phase should fix that.

---

## Problem Space

GSD has a model profile system in `gsd-tools` (`MODEL_PROFILES` in `bin/lib/core.cjs`):

```js
const MODEL_PROFILES = {
  'gsd-planner':          { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'gsd-phase-researcher': { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'gsd-plan-checker':     { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-executor':         { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  // ... etc
};
```

In Claude Code, `Task(subagent_type="gsd-planner", model="inherit")` directly sets the subagent's model. In Copilot CLI, this Claude Code syntax is translated to `/fleet` by the skill adapter — but `/fleet` has no `model=` parameter, so the model specification is **silently dropped**.

**Confirmed by official docs:**
> "By default, subagents use a low-cost AI model." — [/fleet docs](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet)

---

## Current State Analysis

### What `resolveModelInternal` does (correct, runtime-agnostic)
`bin/lib/core.cjs` `resolveModelInternal(cwd, agentType)`:
1. Reads `model_profile` from `.planning/config.json` (defaults to `'balanced'`)
2. Looks up `MODEL_PROFILES[agentType][profile]` → e.g., `'sonnet'`
3. Maps `'opus'` → `'inherit'` (Claude Code semantic: use parent model)
4. Returns the resolved name: `'haiku'`, `'sonnet'`, or `'inherit'`

This is correct for Claude Code. It works fine from Copilot context (the `gsd-tools` binary runs fine). But its output is **never wired into the installed `.agent.md` files**.

### What the installed `.agent.md` files look like (broken)
Current frontmatter for every installed Copilot agent (e.g., `gsd-planner.agent.md`):
```yaml
---
name: "gsd-planner"
description: "..."
tools: ["Read","Write","Bash","Glob","Grep","WebFetch","mcp__context7__*"]
user-invocable: false
---
```
**No `model:` field.** Copilot CLI therefore uses its "low-cost model" (haiku-equivalent) for ALL GSD subagents, regardless of profile.

### What Copilot CLI supports (the fix mechanism)
From [Copilot CLI /fleet docs](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet):
> "If a subagent uses a custom agent profile that specifies a particular AI model, then that model will be used by the subagent."

From [VS Code custom agents reference](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_custom-agent-file-structure):
```yaml
model: claude-sonnet-4.6   # single model
# OR
model: [claude-opus-4.5, claude-sonnet-4.6]  # priority list, falls back
```

The `model:` field is valid in Copilot CLI `.agent.md` files. Setting it makes that model used whenever the agent is invoked as a subagent.

### Model ID mapping gap
`resolveModelInternal` returns abstract names (`'sonnet'`, `'haiku'`, `'inherit'`). Copilot CLI expects concrete model IDs (e.g., `'claude-sonnet-4.6'`, `'claude-haiku-4.5'`). A mapping table is needed in the installer.

Available Copilot CLI model IDs (from current supported model list):
- **opus-tier**: `claude-opus-4.5`, `claude-opus-4.6`
- **sonnet-tier**: `claude-sonnet-4.5`, `claude-sonnet-4.6`
- **haiku-tier**: `claude-haiku-4.5`
- **inherit equivalent**: omit the `model:` field entirely (uses session model)

### The SKILL.md adapter gap (secondary)
The `copilot_skill_adapter` Section C tells the LLM:
> "Task(subagent_type="X", prompt="Y") → prefix the prompt with /fleet"

It says nothing about the `model=` parameter. The LLM may include it in the fleet prompt as-is (harmless but confusing), silently drop it (the current behavior), or misinterpret it. Since model control now comes from agent frontmatter, the adapter should explicitly say: **drop `model=`, model is controlled by agent's `.agent.md` frontmatter**.

---

## Key Findings

1. **The model profile setting is silently ignored in Copilot CLI.** All GSD subagents run on the low-cost model regardless of `quality`/`balanced`/`budget` profile. This is a real regression from Claude Code behavior.

2. **The fix is the `model:` field in `.agent.md` frontmatter.** Officially documented in both `/fleet` docs and VS Code custom agents reference. Supported by Copilot CLI.

3. **Abstract model names (`'sonnet'`, `'haiku'`, `'inherit'`) must be mapped to concrete Copilot model IDs.** The installer needs a mapping table. `'inherit'` → omit `model:` field (use session model, which the user controls via `/model`).

4. **Model injection must happen at install time, not at runtime.** The installer (`convertClaudeAgentToCopilotAgent`) must inject the `model:` field during conversion, using the resolved model for each agent type.

5. **Profile changes require re-installation.** Changing `model_profile` in config.json has no effect until `npx get-shit-done-cc --copilot` is re-run to regenerate the `.agent.md` files. This is a known limitation to document.

6. **The `gsd-tools resolve-model` output needs an additional Copilot mode.** Currently returns `'sonnet'`/`'haiku'`/`'inherit'`. A new flag or mode (e.g., `--runtime copilot`) should return the concrete Copilot model ID.

7. **`gsd-set-profile` skill needs updating.** When profile is changed in Copilot CLI context, it should warn the user to re-run the installer.

---

## Validation Architecture

### Unit tests (`tests/copilot-config.test.cjs`)

**T1 — Model field injection (core fix):**
- `convertClaudeAgentToCopilotAgent` with agent name `gsd-planner` → frontmatter contains `model:` field
- `convertClaudeAgentToCopilotAgent` with agent name `gsd-phase-researcher` → `model:` field present
- `convertClaudeAgentToCopilotAgent` with agent name `gsd-codebase-mapper` (haiku in balanced) → `model: claude-haiku-4.5`
- When resolved model is `'inherit'` → `model:` field is OMITTED from frontmatter

**T2 — Model mapping accuracy:**
- `resolveModelForCopilot('gsd-planner', 'quality')` → `'claude-opus-4.5'` (or latest opus)
- `resolveModelForCopilot('gsd-planner', 'balanced')` → omit (inherit via `''` or `null`)
- `resolveModelForCopilot('gsd-phase-researcher', 'balanced')` → `'claude-sonnet-4.6'`
- `resolveModelForCopilot('gsd-codebase-mapper', 'budget')` → `'claude-haiku-4.5'`

**T3 — Install integration:**
- Full `install()` for Copilot produces `.agent.md` files with correct `model:` fields for balanced profile

### Manual verification (post-implementation)
- Start Copilot CLI with a known model (e.g., `/model claude-opus-4.5`)
- Invoke `/gsd-plan-phase` for a simple phase
- Observe which model each subagent uses (check `/tasks` or session logs)
- Verify that `gsd-codebase-mapper` (haiku in balanced) spawns with haiku, not the session model

---

## Recommended Approach

### Plan 02-01: TDD — Model resolution for Copilot + agent model injection
**Type:** TDD
**Files:** `bin/install.js`, `tests/copilot-config.test.cjs`

Tasks:
1. Write failing tests for `resolveModelForCopilot(agentType, profile)` helper (abstract→Copilot ID mapping)
2. Write failing tests for `convertClaudeAgentToCopilotAgent(content, profile)` injecting `model:` field
3. Implement `resolveModelForCopilot` — mapping table: `{opus: 'claude-opus-4.5', sonnet: 'claude-sonnet-4.6', haiku: 'claude-haiku-4.5', inherit: null}`
4. Update `convertClaudeAgentToCopilotAgent` to accept `profile` param and inject `model: <id>` into frontmatter (omit if null/inherit)
5. Update call sites in `install()` to pass profile through to agent conversion

### Plan 02-02: Install-time profile selection (prompt + --profile flag)
**Type:** Execute
**Files:** `bin/install.js`, `tests/copilot-config.test.cjs` (or `tests/install.test.cjs`)

**Rationale:** Since Copilot CLI bakes model IDs into `.agent.md` at install time (static, unlike Claude Code's runtime resolution), the user MUST choose a profile at install time. Changing it later requires re-running the installer. Currently there is no prompt or flag for this.

Tasks:
1. Add `--profile <budget|balanced|quality>` CLI flag to install (parse from `process.argv`, add to help text, add to usage examples for `--copilot`)
2. Add `promptProfile(runtimes, isGlobal, callback)` function (readline-based, same pattern as `promptRuntime`/`promptLocation`); default: `balanced`
3. Wire interactive flow: `promptRuntime` → `promptLocation` → `promptProfile` → `installAllRuntimes(runtimes, isGlobal, profile)`
4. Wire non-interactive / CLI-flag flow: pass `profile` from flag (or default `'balanced'`) to `installAllRuntimes`
5. Write resolved profile to `.planning/config.json` during Copilot install (so `gsd-set-profile` reflects the same value)
6. Add tests: `--profile quality` flag parsing, interactive profile prompt, config.json write

### Plan 02-03: Update SKILL.md adapter + documentation
**Type:** Execute
**Files:** `bin/install.js` (getCopilotSkillAdapterHeader), `tests/copilot-config.test.cjs`

Tasks:
1. Update `getCopilotSkillAdapterHeader` Section C: cover all three invocation patterns (`/fleet`, `@agent-name`, `useSubagent`/`#runSubagent`); clarify that `model=` is dropped and model is set via agent frontmatter at install time
2. Update `gsd-set-profile` skill adapter header text to warn: "Profile changes require re-running the Copilot installer (`npx get-shit-done-cc --copilot`) to take effect"
3. Add test coverage for updated adapter Section C content

---

## Addendum: useSubagent / #runSubagent and the `task` Tool

### What useSubagent / #runSubagent actually are

`useSubagent` and `#runSubagent` are **prompting conventions** — natural language keywords written inside SKILL.md instruction text that tell the Copilot main agent to delegate a subtask to a subagent. They are equivalent to `Task(...)` in Claude Code. Neither accepts a `model=` parameter; they are plain-text directives.

### The `agent` tool (the actual dispatch mechanism)

From the official tools reference, Claude Code's `Task` tool maps to Copilot CLI's `agent` tool:

| Claude Code | Copilot CLI alias |
|-------------|-------------------|
| `Task(subagent_type="X", prompt="Y")` | `agent` tool — invokes custom agent `X` with prompt `Y` |

When Copilot CLI uses the `agent` tool to spawn a custom agent, the agent's `.agent.md` `model:` field controls the model. Without it, Copilot uses its low-cost default.

### Three subagent invocation patterns in Copilot CLI

| Pattern | Model control | Use case |
|---------|---------------|----------|
| `/fleet [prompt]` | Via agent `model:` field OR inline prompt text ("Use Claude Opus 4.5 to...") | Parallel fan-out |
| `@agent-name [prompt]` | Via agent `model:` field | Serial, direct delegation |
| `useSubagent`/`#runSubagent` in skill text | Via agent `model:` field (if named agent is used) | Informal serial delegation |

**Conclusion:** Regardless of invocation pattern, the `.agent.md` `model:` field is the only reliable, install-time model-control mechanism. This reinforces the Plan 02-01 approach.

### Revised Section C for copilot_skill_adapter

Plan 02-02 should update Section C to cover all three patterns:

```
## C. Task() → Subagent Delegation

GSD workflows use Task(subagent_type="X", model="Y", prompt="Z"). In Copilot CLI:

- Parallel fan-out:   /fleet — orchestrator runs subagents in parallel
- Serial delegation:  @agent-name OR useSubagent/runSubagent in instructions
- Model control:      comes from the agent's .agent.md `model:` frontmatter (set at install time)
- Drop model= param:  has no effect in Copilot CLI; model is fixed in agent frontmatter
- No close_agent():   fleet manages cleanup automatically
```

---

## Risks & Unknowns

| Risk | Severity | Notes |
|------|----------|-------|
| Copilot model IDs change over time | MEDIUM | Use a latest-stable approach; consider model arrays for fallback |
| `model:` field may not work in all Copilot CLI versions | MEDIUM | Test with current version; note minimum version requirement |
| `inherit` → omit may not give "session model" behavior as expected | LOW | Omitting is standard; user controls session model via `/model` |
| Re-install requirement for profile changes is friction | LOW | Document clearly; out of scope to automate |
| Profile at install time may not match profile at run time | LOW | Documented limitation; same issue exists for any static install |

---

## ## RESEARCH COMPLETE
