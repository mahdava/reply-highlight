import { expect, test } from 'claude-code/testing'

import { callHeader, failures, groupSummary } from '../hooks/tools'

const call = (tool: string, isErrored = false) => ({ tool, input: {}, isErrored })

test("a group's line counts what its calls did, in the order seen", async () => {
  expect(groupSummary([call('Bash')])).toBe('Ran 1 shell command')
  expect(groupSummary([call('Read'), call('Bash'), call('Read'), call('Edit'), call('MultiEdit')])).toBe(
    'Read 2 files, ran 1 shell command, edited 2 files',
  )
  expect(groupSummary([call('Grep'), call('Glob')])).toBe('Searched for 2 patterns')
  expect(groupSummary([call('Thing'), call('Thing')])).toBe('Used Thing 2 times')
  expect(failures([call('Bash', true), call('Read')])).toBe(1)
})

test("a call's header names the tool and what it was about", async () => {
  expect(callHeader('Bash', { command: 'git status', description: 'Show working tree status' })).toEqual({
    name: 'Bash',
    subject: 'Show working tree status',
    isPath: false,
  })
  expect(callHeader('Read', { file_path: '/repo/hooks/tools.ts' })).toEqual({ name: 'Read', subject: '/repo/hooks/tools.ts', isPath: true })
  expect(callHeader('mcp__linear__get_issue', { id: 'GRIS-657' })).toEqual({ name: 'linear · get_issue', subject: 'GRIS-657', isPath: false })
  expect(callHeader('Bash', { command: 'a\nb' }).subject).toBe('a')
  expect(callHeader('Bash', { command: 'x'.repeat(120) }).subject).toHaveLength(90)
})
