import { expect, test } from 'claude-code/testing'

import { highlight } from '../hooks/highlight'

test('plain prose is left as it is', async () => {
  expect(highlight('Nothing to mark here.')).toBe('Nothing to mark here.')
})
