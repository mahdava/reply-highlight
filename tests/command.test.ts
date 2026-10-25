import { expect, mock, test } from 'claude-code/testing'

// A home folder in memory: what the plugin reads and writes there.
function world(on: any, saved?: string) {
  const files: Record<string, string> = saved === undefined ? {} : { '/home/t/.claude/reply-highlight/theme.json': saved }
  const invalidated: string[] = []
  mock.env(on, { HOME: '/home/t' })
  on('session.start', (_$: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('fs.read', (_$: unknown, e: { path: string }) => {
    if (!(e.path in files)) {
      throw new Error(`ENOENT: ${e.path}`)
    }
    return { value: files[e.path] }
  })
  on('fs.write', (_$: unknown, e: { path: string; text: string }) => {
    files[e.path] = e.text
    return { value: undefined }
  })
  on('ui.invalidate', (_$: unknown, e: { event: string }) => {
    invalidated.push(e.event)
    return { value: undefined }
  })
  on('ui.log', () => ({ value: undefined }))
  return { files, invalidated }
}

const run = ($: any, args: string) =>
  $.command.run({ command: 'reply-highlight', args, origin: { kind: 'user' }, presentation: {} })

test('a pasted theme is saved as its changes and redraws the transcript', async ($, on) => {
  const { files, invalidated } = world(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const answer = await run($, 'theme {"heading":"#ff8800","bullet":{"glyph":"🌸"}}')
  expect(answer.text).toContain('Theme saved')
  expect(answer.text).toContain('bullet.glyph: one character')
  expect(JSON.parse(files['/home/t/.claude/reply-highlight/theme.json'])).toEqual({ heading: '#ff8800' })
  expect(invalidated).toContain('ui.render')
  expect((await run($, 'theme current')).text).toContain('"heading": "#ff8800"')
})

test('a saved theme is read when the session starts, and reset clears it', async ($, on) => {
  const { files } = world(on, '{"table":{"stripe":"#000000"}}')
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const current = (await run($, 'theme current')).text
  expect(current).toContain('with your changes')
  expect(current).toContain('"stripe": "#000000"')
  expect(current).toContain('"heading": "claude"')
  expect((await run($, 'reset')).text).toBe('Back to the built-in look.')
  expect(files['/home/t/.claude/reply-highlight/theme.json']).toBe('{}\n')
  expect((await run($, 'theme current')).text).toContain('The built-in look. Paste')
  expect((await run($, '')).text).toContain('/reply-highlight theme current')
})

test('text that is not JSON saves nothing', async ($, on) => {
  const { files } = world(on)
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  expect((await run($, 'theme {heading')).text).toContain('not valid JSON')
  expect(files).toEqual({})
})
