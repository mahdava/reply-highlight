import { expect, test } from 'claude-code/testing'

import { changes, DEFAULT_THEME, readTheme } from '../hooks/theme'

test('no saved theme is the built-in look', async () => {
  expect(readTheme(undefined)).toEqual({ theme: DEFAULT_THEME, problems: [] })
  expect(readTheme({})).toEqual({ theme: DEFAULT_THEME, problems: [] })
})

test('saved values replace only what they name', async () => {
  const { theme, problems } = readTheme({ heading: '#ff8800', chips: { hash: { background: 'subtle' } } })
  expect(problems).toEqual([])
  expect(theme.heading).toBe('#ff8800')
  expect(theme.chips.hash).toEqual({ color: DEFAULT_THEME.chips.hash.color, background: 'subtle' })
  expect(theme.chips.file).toEqual(DEFAULT_THEME.chips.file)
})

test('a prompt row can hold its own list of symbols', async () => {
  const { theme } = readTheme({ prompt: { row: [{ glyph: '•', color: '#444444' }, { glyph: '◦' }, {}] } })
  expect(theme.prompt.row).toEqual([
    { glyph: '•', color: '#444444' },
    { glyph: '◦', color: DEFAULT_THEME.prompt.row[1].color },
    DEFAULT_THEME.prompt.row[0],
  ])
})

test('values that do not check out keep the built-in look and are named', async () => {
  const { theme, problems } = readTheme({
    heading: 'red',
    bullet: { glyph: '🌸' },
    prompt: { spaceAbove: 9, row: [] },
    sparkles: true,
  })
  expect(theme).toEqual(DEFAULT_THEME)
  expect(problems).toEqual([
    'sparkles: not a part of the theme',
    expect.stringContaining('heading: #rrggbb or one of'),
    'bullet.glyph: one character, one cell wide (no emoji)',
    'prompt.row: a list of 1 to 8 symbols',
    'prompt.spaceAbove: a whole number from 0 to 4',
  ])
})

test('changes are only what differs from the built-in look', async () => {
  const { theme } = readTheme({ heading: '#ff8800', table: { stripe: '#000000' } })
  expect(changes(theme)).toEqual({ heading: '#ff8800', table: { stripe: '#000000' } })
  expect(changes(DEFAULT_THEME)).toBe(undefined)
})
