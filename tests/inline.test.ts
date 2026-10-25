import { expect, test } from 'claude-code/testing'

import { runs } from '../hooks/inline'

test('files, hashes and code names are marked by kind', async () => {
  expect(runs('Merged a782c71 into hooks/layout.ts via layout().')).toEqual([
    { text: 'Merged ' },
    { text: 'a782c71', kind: 'hash' },
    { text: ' into ' },
    { text: 'hooks/layout.ts', kind: 'file' },
    { text: ' via ' },
    { text: 'layout()', kind: 'code' },
    { text: '.' },
  ])
})

test('inline code, bold and italic keep their meaning', async () => {
  expect(runs('Run `git log`, **then** *wait* for README.md')).toEqual([
    { text: 'Run ' },
    { text: 'git log', kind: 'code' },
    { text: ', ' },
    { text: 'then', bold: true },
    { text: ' ' },
    { text: 'wait', italic: true },
    { text: ' for ' },
    { text: 'README.md', kind: 'file' },
  ])
})
