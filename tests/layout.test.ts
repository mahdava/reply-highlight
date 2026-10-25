import { expect, test } from 'claude-code/testing'

import { layout } from '../hooks/layout'

test('a reply with no headings or labels stays one markdown block', async () => {
  expect(layout('Just a sentence about hooks/register.ts.')).toEqual([
    { kind: 'markdown', gap: false, text: 'Just a sentence about `hooks/register.ts`.' },
  ])
})

test('headings and labelled items become their own blocks, in order', async () => {
  const reply = ['Short version.', '', '## Details', '', '- **Other sessions:** not yet, see a782c71.', '- Plain item.'].join('\n')
  expect(layout(reply)).toEqual([
    { kind: 'markdown', gap: false, text: 'Short version.' },
    { kind: 'heading', gap: true, text: 'Details' },
    { kind: 'item', gap: true, marker: '- ', label: 'Other sessions', rest: 'not yet, see `a782c71`.', width: 16 },
    { kind: 'markdown', gap: false, text: '- Plain item.' },
  ])
})

test('all three label spellings are read', async () => {
  for (const line of ['- **Size:** small', '- **Size**: small', '- Size: small', '  2. Size: small']) {
    const [block] = layout(line)
    expect(block.kind).toBe('item')
    expect(block.kind === 'item' && block.label).toBe('Size')
  }
})

test('long openings, code labels and fenced code are left to markdown', async () => {
  const kept = [
    '- This sentence runs on for far too many words before its colon: no.',
    '- `code`: stays.',
    '```\n## not a heading\n- Label: not an item\n```',
  ]
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
  expect(item.kind === 'item' && item.rest).toBe('colour labels\nLook at `hooks/layout.ts` first.')
})
