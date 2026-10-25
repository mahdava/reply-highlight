import { expect, test } from 'claude-code/testing'

import { layout } from '../hooks/layout'

test('headings, paragraphs and list items become their own blocks, in order', async () => {
  const reply = ['Short version.', '', '## Details', '', '- **Other sessions:** not yet, see a782c71.', '- Plain item.'].join('\n')
  expect(layout(reply)).toEqual([
    { kind: 'para', gap: false, text: 'Short version.' },
    { kind: 'heading', gap: true, level: 2, text: 'Details' },
    { kind: 'item', gap: true, marker: '- ', label: 'Other sessions', rest: 'not yet, see a782c71.', width: 16 },
    { kind: 'item', gap: false, marker: '- ', label: '', rest: 'Plain item.', width: 0 },
  ])
})

test('all three label spellings are read', async () => {
  for (const line of ['- **Size:** small', '- **Size**: small', '- Size: small', '  2. Size: small']) {
    const [block] = layout(line)
    expect(block.kind === 'item' && block.label).toBe('Size')
  }
})

test('long openings and code are items without a label', async () => {
  for (const line of ['- This sentence runs on for far too many words before its colon: no.', '- `code`: stays.']) {
    const [block] = layout(line)
    expect(block.kind === 'item' && block.label).toBe('')
  }
})

test('a plain table becomes its header and rows', async () => {
  expect(layout('| Kind | Example |\n|---|:-:|\n| **File** | hooks/layout.ts |\n| Pipe | a \\| b |\n| Short |')).toEqual([
    { kind: 'table', gap: false, head: ['Kind', 'Example'], rows: [['**File**', 'hooks/layout.ts'], ['Pipe', 'a | b'], ['Short', '']] },
  ])
})

test('code blocks, tables with links and lines with links are left to markdown', async () => {
  const kept = ['```\n## not a heading\n- Label: not an item\n```', '| a | b |\n|---|---|\n| [x](https://example.com) | y |', 'See [the docs](https://example.com).']
  for (const text of kept) {
    expect(layout(text).every(b => b.kind === 'markdown')).toBe(true)
  }
})

test('labels next to each other share one column, as wide as the longest', async () => {
  const blocks = layout(['- **Tests:** 11 pass.', '- **What I couldn\'t check:** the screen.', '', '- **Tidy-up:** done.'].join('\n'))
  expect(blocks.map(b => b.kind === 'item' && b.width)).toEqual([23, 23, 23])
})

test('an indented line after an item is drawn under its text', async () => {
  const [item] = layout(['- **Commit 5 of 5:** colour labels', '  Look at hooks/layout.ts first.'].join('\n'))
  expect(item.kind === 'item' && item.rest).toBe('colour labels\nLook at hooks/layout.ts first.')
})
