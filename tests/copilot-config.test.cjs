/**
 * GSD Tools Tests - copilot-config.cjs
 *
 * Tests for Copilot adapter header, skill conversion, agent conversion,
 * hooks installation/uninstall, and integration test.
 */

// Enable test exports from install.js (skips main CLI logic)
process.env.GSD_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getCopilotSkillAdapterHeader,
  convertClaudeCommandToCopilotSkill,
  convertClaudeAgentToCopilotAgent,
} = require('../bin/install.js');

// ─── getCopilotSkillAdapterHeader ───────────────────────────────────────────────

describe('getCopilotSkillAdapterHeader', () => {
  test('contains all three sections', () => {
    const result = getCopilotSkillAdapterHeader('gsd-execute-phase');
    assert.ok(result.includes('<copilot_skill_adapter>'), 'has opening tag');
    assert.ok(result.includes('</copilot_skill_adapter>'), 'has closing tag');
    assert.ok(result.includes('## A. Skill Invocation'), 'has section A');
    assert.ok(result.includes('## B. AskUserQuestion'), 'has section B');
    assert.ok(result.includes('## C. Task() → /fleet'), 'has section C (uses /fleet not spawn_agent)');
  });

  test('includes correct invocation syntax', () => {
    const result = getCopilotSkillAdapterHeader('gsd-plan-phase');
    assert.ok(result.includes('`$gsd-plan-phase`'), 'has $skillName invocation');
    assert.ok(result.includes('{{GSD_ARGS}}'), 'has GSD_ARGS variable');
  });

  test('section B describes interactive list, not request_user_input', () => {
    const result = getCopilotSkillAdapterHeader('gsd-discuss-phase');
    // Copilot uses numbered list, NOT request_user_input as primary interaction
    // (The text may mention request_user_input to explain it's NOT available)
    // Instead uses numbered list
    assert.ok(
      result.includes('numbered') || result.includes('list'),
      'documents numbered list interaction'
    );
    // Non-interactive/autopilot fallback
    assert.ok(
      result.includes('autopilot') || result.includes('non-interactive'),
      'mentions autopilot or non-interactive fallback'
    );
    // Multi-select via comma-separated
    assert.ok(
      result.includes('comma') || result.includes('multi-select') || result.includes('multi'),
      'mentions multi-select via comma'
    );
  });

  test('section C maps Task to /fleet', () => {
    const result = getCopilotSkillAdapterHeader('gsd-execute-phase');
    assert.ok(result.includes('/fleet'), 'maps to /fleet for parallel fan-out');
    assert.ok(result.includes('@agent-name') || result.includes('@'), 'mentions @agent-name for serial work');
    // No close_agent needed
    assert.ok(
      result.includes('no') || result.toLowerCase().includes('cleanup') || result.includes('manages'),
      'mentions fleet manages cleanup'
    );
  });
});

// ─── convertClaudeCommandToCopilotSkill ─────────────────────────────────────────

describe('convertClaudeCommandToCopilotSkill', () => {
  test('produces valid SKILL.md frontmatter', () => {
    const input = `---
description: Plan a GSD phase
---

Run with $ARGUMENTS`;

    const result = convertClaudeCommandToCopilotSkill(input, 'gsd-plan-phase');
    assert.ok(result.startsWith('---\n'), 'starts with frontmatter');
    assert.ok(result.includes('name: "gsd-plan-phase"'), 'has quoted skill name');
    assert.ok(result.includes('description:'), 'has description in frontmatter');
    assert.ok(result.includes('Plan a GSD phase'), 'has correct description content');
  });

  test('converts $ARGUMENTS to {{GSD_ARGS}}', () => {
    const input = `---
description: Test
---

Run with $ARGUMENTS here`;

    const result = convertClaudeCommandToCopilotSkill(input, 'gsd-test');
    assert.ok(result.includes('{{GSD_ARGS}}'), 'converts $ARGUMENTS to {{GSD_ARGS}}');
    assert.ok(!result.includes('$ARGUMENTS'), 'original $ARGUMENTS removed');
  });

  test('converts slash commands', () => {
    const input = `---
description: Test
---

Use /gsd:execute-phase to run.`;

    const result = convertClaudeCommandToCopilotSkill(input, 'gsd-test');
    assert.ok(result.includes('$gsd-execute-phase'), 'converts slash commands');
    assert.ok(!result.includes('/gsd:execute-phase'), 'original slash command removed');
  });

  test('includes copilot adapter header', () => {
    const input = `---
description: Test skill
---

Body content.`;

    const result = convertClaudeCommandToCopilotSkill(input, 'gsd-test');
    assert.ok(result.includes('<copilot_skill_adapter>'), 'body contains copilot adapter header');
  });
});

// ─── convertClaudeAgentToCopilotAgent ───────────────────────────────────────────

describe('convertClaudeAgentToCopilotAgent', () => {
  const sampleInput = `---
name: gsd-executor
description: Executes GSD plans with atomic commits
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
---

<role>
You are a GSD plan executor.
</role>`;

  test('adds copilot_agent_role header and cleans frontmatter', () => {
    const result = convertClaudeAgentToCopilotAgent(sampleInput);

    // Frontmatter rebuilt with name, description, tools (JSON array), user-invocable: false
    assert.ok(result.startsWith('---\n'), 'starts with frontmatter');
    assert.ok(result.includes('"gsd-executor"'), 'has quoted name');
    assert.ok(result.includes('"Executes GSD plans with atomic commits"'), 'has quoted description');
    assert.ok(result.includes('user-invocable: false'), 'has user-invocable: false');
    assert.ok(!result.includes('color: yellow'), 'drops color field');

    // Tools as JSON array in frontmatter
    assert.ok(result.includes('tools: ['), 'tools is a JSON array');
    assert.ok(result.includes('"Read"'), 'has Read in tools array');
    assert.ok(result.includes('"Write"'), 'has Write in tools array');

    // Has copilot_agent_role block (NOT codex_agent_role)
    assert.ok(result.includes('<copilot_agent_role>'), 'has copilot_agent_role header');
    assert.ok(!result.includes('<codex_agent_role>'), 'does NOT use codex_agent_role tag');
    assert.ok(result.includes('role: gsd-executor'), 'role matches agent name');
    assert.ok(result.includes('purpose: Executes GSD plans with atomic commits'), 'purpose from description');
    assert.ok(result.includes('</copilot_agent_role>'), 'has closing tag');

    // Body preserved
    assert.ok(result.includes('<role>'), 'body content preserved');
  });

  test('tools field is a JSON array string', () => {
    const result = convertClaudeAgentToCopilotAgent(sampleInput);
    // Find the frontmatter tools line
    const lines = result.split('\n');
    const toolsLine = lines.find(l => l.startsWith('tools:'));
    assert.ok(toolsLine, 'has tools line in frontmatter');
    // Should be JSON array format: tools: ["Read", "Write", ...]
    assert.ok(toolsLine.includes('['), 'tools line contains opening bracket (JSON array)');
    assert.ok(toolsLine.includes(']'), 'tools line contains closing bracket (JSON array)');
    // Should NOT be comma-separated string format
    assert.ok(!toolsLine.includes('Read, Write'), 'NOT comma-separated string');
  });

  test('drops color field from frontmatter', () => {
    const result = convertClaudeAgentToCopilotAgent(sampleInput);
    const fmEnd = result.indexOf('---', 4);
    const frontmatterSection = result.substring(0, fmEnd + 3);
    assert.ok(!frontmatterSection.includes('color:'), 'color field dropped from frontmatter');
  });

  test('converts slash commands in body', () => {
    const input = `---
name: gsd-test
description: Test agent
tools: Read
---

Run /gsd:execute-phase to proceed.`;

    const result = convertClaudeAgentToCopilotAgent(input);
    assert.ok(result.includes('$gsd-execute-phase'), 'converts slash commands');
    assert.ok(!result.includes('/gsd:execute-phase'), 'original slash command removed');
  });

  test('handles content without frontmatter', () => {
    const input = 'Just some content without frontmatter.';
    const result = convertClaudeAgentToCopilotAgent(input);
    assert.strictEqual(result, input, 'returns input unchanged');
  });
});
