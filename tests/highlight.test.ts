import { expect, test } from 'claude-code/testing'

import { highlight } from '../hooks/highlight'

test('plain prose is left as it is', async () => {
  expect(highlight('Nothing to mark here.')).toBe('Nothing to mark here.')
})

test('paths are marked, with or without a line number', async () => {
  expect(highlight('Open hooks/register.ts first.')).toBe('Open `hooks/register.ts` first.')
  expect(highlight('See ~/.claude/skills/pr-recap and ./tools/x.')).toBe(
    'See `~/.claude/skills/pr-recap` and `./tools/x`.',
  )
  expect(highlight('It lives at internal/store/models.go:431.')).toBe('It lives at `internal/store/models.go:431`.')
  expect(highlight('Edit README.md now.')).toBe('Edit `README.md` now.')
})

test('words with a slash are not paths', async () => {
  expect(highlight('Use and/or here, over TCP/IP.')).toBe('Use and/or here, over TCP/IP.')
})

test('commit hashes are marked, plain hex words are not', async () => {
  expect(highlight('Merged as a782c71 today.')).toBe('Merged as `a782c71` today.')
  expect(highlight('A deadbeef cafe.')).toBe('A deadbeef cafe.')
})

test('names from code are marked', async () => {
  expect(highlight('Then restoreSelection(commits, lastSeen) picks it.')).toBe(
    'Then `restoreSelection(commits, lastSeen)` picks it.',
  )
  expect(highlight('It reads lastSeen and sets OPENCLAW_COAUTHOR.')).toBe(
    'It reads `lastSeen` and sets `OPENCLAW_COAUTHOR`.',
  )
  expect(highlight('The approval_timeout_seconds column.')).toBe('The `approval_timeout_seconds` column.')
  expect(highlight('Read e.props.text first.')).toBe('Read e.props.text first.')
})

test('ordinary words and brackets in prose are not code', async () => {
  const kept = [
    'The proxy (see above) waits for you.',
    'NotSoFast and Commit Walk are names, not code.',
    'An iPhone-style toggle, e.g. this one.',
  ]
  for (const text of kept) {
    expect(highlight(text)).toBe(text)
  }
})

test("a list item's short label is bold", async () => {
  expect(highlight('- Reading order: commits to follow.')).toBe('- **Reading order**: commits to follow.')
  expect(highlight('  2. Size: proportional to the diff.')).toBe('  2. **Size**: proportional to the diff.')
  expect(highlight('- Branch: feat/gris-652-pr-recap')).toBe('- **Branch**: `feat/gris-652-pr-recap`')
})

test('long openings and labels already styled are left alone', async () => {
  const kept = [
    '- This sentence runs on for far too many words before its colon: no.',
    '- **Already bold**: yes.',
    '- `code`: stays.',
    'Not a list: no.',
  ]
  for (const text of kept) {
    expect(highlight(text)).toBe(text)
  }
})

test('code, links, tables and headings stay exactly as written', async () => {
  const kept = [
    '```ts\nconst p = "hooks/register.ts"\n```',
    'Already `hooks/register.ts` marked.',
    'A [link to docs/guide.md](https://example.com/docs/guide.md).',
    'See https://example.com/a/b/c.md for more.',
    '| hooks/register.ts | a782c71 |',
    '## hooks/register.ts',
    '**hooks/register.ts** is bold.',
  ]
  for (const text of kept) {
    expect(highlight(text)).toBe(text)
  }
})
