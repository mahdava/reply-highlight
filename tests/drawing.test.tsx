import { expect, test } from 'claude-code/testing'

// Claude Code accepts each drawing the mod returns: a refused tree would make
// the engine fall back to its own.
const draws = async ($: any, component: string, props: unknown) => {
  const mounted = await $.ui.mount({ plugin: 'reply-highlight', surface: 'terminal', component, props })
  expect(mounted).toBeDefined()
}

test('a reply with every part draws', async $ => {
  const text = [
    'See https://claude.ai/artifact/abc and hooks/layout.ts at a782c71 in `layout()`.',
    '## Heading',
    '- **Label:** text',
    '1. first',
    '| a | b |',
    '|---|---|',
    '| x | y |',
    '> a quote',
    '```ts',
    'const a = 1',
    '```',
  ].join('\n')
  await draws($, 'AssistantMessage', { text, isFirstOfReply: true })
})

test('tool rows draw', async $ => {
  await draws($, 'ToolUse', { tool_use_id: 't1', tool: 'Read', input: { file_path: '/repo/a.ts' }, isRunning: false, isErrored: false, isInterrupted: false })
  await draws($, 'ToolGroup', {
    calls: [{ tool: 'Bash', input: { command: 'ls' }, isRunning: false, isErrored: true, isInterrupted: false }],
    isActive: false,
    isExpanded: false,
  })
})
