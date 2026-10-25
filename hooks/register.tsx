import type { Register } from 'claude-code'

import { runs } from './inline'
import { layout } from './layout'
import { changes, DEFAULT_THEME, readTheme, type Theme } from './theme'
import { callHeader, failures, groupSummary } from './tools'

// The look in use: the built-in theme until a saved one is read.
let theme: Theme = DEFAULT_THEME

// Where /reply-highlight keeps a saved theme: only the values that differ
// from the built-in look, so later changes to the built-in look still reach it.
const THEME_FILE = '.claude/reply-highlight/theme.json'

const USAGE = [
  'Usage:',
  "  /reply-highlight theme current  show the theme in use, to load into the theme designer",
  "  /reply-highlight theme {...}    save a theme (from the theme designer's Copy command button)",
  '  /reply-highlight reset          go back to the built-in look',
].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'reply-highlight',
        description: "Show, save or reset Reply Highlight's theme: the colours and symbols of replies and prompts",
        argumentHint: '[theme current|theme {...}|reset]',
        immediate: true,
      })
    } catch (cause) {
      $.ui.log(`reply-highlight: /reply-highlight is unavailable: ${String(cause)}`)
    }
    const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
    if (home !== undefined) {
      const saved = await $.fs.read(`${home}/${THEME_FILE}`).catch(() => null)
      if (saved !== null) {
        let json: unknown
        try {
          json = JSON.parse(saved)
        } catch {
          $.ui.log(`reply-highlight: ~/${THEME_FILE} is not valid JSON; using the built-in look`)
        }
        const read = readTheme(json)
        theme = read.theme
        if (read.problems.length > 0) {
          $.ui.log(`reply-highlight: kept the built-in look for: ${read.problems.join('; ')}`)
        }
        $.ui.invalidate('ui.render')
      }
    }
    return next(e)
  })

  on('command.run', { command: 'reply-highlight' }, async ($, e) => {
    const [word, ...rest] = e.args.trim().split(/\s+/)
    const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
    if (home === undefined) {
      return { text: 'Reply Highlight cannot find your home folder (HOME is unset).' }
    }
    const file = `${home}/${THEME_FILE}`

    if (word === 'theme' && rest.join(' ') === 'current') {
      const where = changes(theme) === undefined ? 'The built-in look' : `The built-in look with your changes from ~/${THEME_FILE}`
      return {
        text: `${where}. Paste it into the theme designer's "Load a theme you already have":\n${JSON.stringify(theme, null, 2)}`,
      }
    }
    if (word === 'reset') {
      await $.fs.write(file, '{}\n')
      theme = DEFAULT_THEME
      $.ui.invalidate('ui.render')
      return { text: 'Back to the built-in look.' }
    }
    if (word === 'theme') {
      let json: unknown
      try {
        json = JSON.parse(rest.join(' '))
      } catch {
        return { text: `That theme is not valid JSON. Copy it again from the theme designer.\n\n${USAGE}` }
      }
      const read = readTheme(json)
      const saved = changes(read.theme) ?? {}
      await $.fs.write(file, JSON.stringify(saved, null, 2) + '\n')
      theme = read.theme
      $.ui.invalidate('ui.render')
      const kept = read.problems.length > 0 ? `\nKept the built-in look for:\n- ${read.problems.join('\n- ')}` : ''
      return { text: `Theme saved in ~/${THEME_FILE}; replies and prompts are drawn with it now.${kept}` }
    }
    return { text: USAGE }
  })

  // Rewrites only what the transcript draws for a reply; the stored message
  // and what the model reads stay as they were.
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const blocks = layout(e.props.text)
    if (blocks.every(b => b.kind === 'markdown')) {
      return next({ ...e, props: { ...e.props, text: blocks.map(b => b.text).join('\n\n') } })
    }

    const { Box, Markdown, Text } = $.ui.resolve(e)

    const prose = (text: string) => (
      <Text>
        {runs(text).map(r => (
          <Text weight={r.bold ? 'bold' : undefined} italic={r.italic} underline={r.kind === 'link' || undefined} {...(r.kind ? { color: theme.chips[r.kind].color, backgroundColor: theme.chips[r.kind].background } : {})}>
            {r.text}
          </Text>
        ))}
      </Text>
    )

    const bullet = (marker: string) => {
      const [, indent, sign, space] = /^(\s*)([-*+]|\d+[.)])(\s+)$/.exec(marker) ?? []
      if (sign === undefined) {
        return <Text>{marker}</Text>
      }
      return (
        <Text>
          {indent}
          {/\d/.test(sign) ? <Text color={theme.number}>{sign}</Text> : <Text color={theme.bullet.color}>{theme.bullet.glyph}</Text>}
          {space}
        </Text>
      )
    }

    // A table with faint lines, a green header and the cells drawn as prose.
    // Columns start as wide as their longest cell and shrink together, wrapping,
    // when the window is narrower.
    const table = (head: string[], rows: string[][]) => {
      const widths = head.map((h, i) =>
        Math.max(h.length, ...rows.map(r => runs(r[i]).reduce((n, run) => n + run.text.length, 0)), 1),
      )
      const line = (text: string) => (
        <Box flexShrink={0}>
          <Text color={theme.table.line}>{text}</Text>
        </Box>
      )
      const row = (draw: (i: number) => unknown, left: string, middle: string, right: string, background?: string) => (
        <Box flexDirection="row" backgroundColor={background}>
          {line(left)}
          {widths.flatMap((w, i) => [
            <Box width={w} flexShrink={1}>
              {draw(i)}
            </Box>,
            line(i < widths.length - 1 ? middle : right),
          ])}
        </Box>
      )
      const rule = (left: string, middle: string, right: string) =>
        row(
          i => (
            <Text color={theme.table.line} wrap="truncate">
              {'─'.repeat(widths[i])}
            </Text>
          ),
          left + '─',
          '─' + middle + '─',
          '─' + right,
        )

      return (
        <Box flexDirection="column">
          {rule('┌', '┬', '┐')}
          {row(
            i => (
              <Text weight="bold" color={theme.table.header}>
                {head[i]}
              </Text>
            ),
            '│ ',
            ' │ ',
            ' │',
          )}
          {rule('├', '┼', '┤')}
          {rows.flatMap((r, n) => [
            ...(n > 0 ? [rule('├', '┼', '┤')] : []),
            row(i => prose(r[i]), '│ ', ' │ ', ' │', n % 2 === 0 ? theme.table.stripe : undefined),
          ])}
          {rule('└', '┴', '┘')}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {blocks.map((b, i) => {
          // a terminal has no half lines, so list items get one empty row between them
          const afterItem = b.kind === 'item' && blocks[i - 1]?.kind === 'item'
          const marginTop = b.gap || afterItem ? 1 : 0
          if (b.kind === 'heading') {
            return (
              <Box marginTop={marginTop}>
                <Text weight="bold" color={b.level <= 2 ? theme.heading : theme.subheading}>
                  {b.text}
                </Text>
              </Box>
            )
          }
          if (b.kind === 'item') {
            return (
              <Box flexDirection="row" marginTop={marginTop}>
                <Box flexShrink={0}>
                  {bullet(b.marker)}
                </Box>
                {b.label !== '' && (
                  <Box width={b.width} flexShrink={0}>
                    <Text weight="bold" color={theme.label}>
                      {b.label}:
                    </Text>
                  </Box>
                )}
                <Box flexGrow={1} flexShrink={1}>
                  {prose(b.rest)}
                </Box>
              </Box>
            )
          }
          if (b.kind === 'code') {
            return (
              <Box flexDirection="column" marginTop={marginTop}>
                <Text>
                  <Text color={theme.code.line}>{'── '}</Text>
                  <Text color={theme.code.label}>{b.lang || 'code'}</Text>
                  <Text color={theme.code.line}>{' ' + '─'.repeat(20)}</Text>
                </Text>
                <Box backgroundColor={theme.code.background}>
                  <Markdown text={b.text} />
                </Box>
              </Box>
            )
          }
          if (b.kind === 'quote') {
            return (
              <Box flexDirection="column" marginTop={marginTop}>
                {b.lines.map(l => (
                  <Box flexDirection="row">
                    <Box flexShrink={0}>
                      <Text color={theme.quote.color}>{theme.quote.glyph + ' '}</Text>
                    </Box>
                    <Box flexGrow={1} flexShrink={1}>
                      {prose(l)}
                    </Box>
                  </Box>
                ))}
              </Box>
            )
          }
          if (b.kind === 'table') {
            return <Box marginTop={marginTop}>{table(b.head, b.rows)}</Box>
          }
          if (b.kind === 'para') {
            return <Box marginTop={marginTop}>{prose(b.text)}</Box>
          }
          return (
            <Box marginTop={marginTop}>
              <Markdown text={b.text} />
            </Box>
          )
        })}
      </Box>
    )
  })

  // Draws a prompt you typed; notifications and messages from other agents
  // keep the engine's drawing. (A typed prompt reads isExpanded false in the
  // normal view too, so that flag is no sign of a shortened row here.)
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (e.props.origin.kind !== 'composer') {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    // More symbols than any window is wide, in a box one row high that hides
    // the rest: the row fills the width and never wraps onto a second line,
    // however the terminal is resized.
    const { row: marks, chevron } = theme.prompt
    const flowers = (
      <Box height={1} overflow="hidden">
        <Text>
          {Array.from({ length: 200 }, (_, i) => (
            <Text color={marks[i % marks.length].color}>{marks[i % marks.length].glyph + ' '}</Text>
          ))}
        </Text>
      </Box>
    )
    // Empty rows above the frame set each exchange apart from the one before;
    // those below lead into the reply.
    return (
      <Box flexDirection="column" marginTop={theme.prompt.spaceAbove} marginBottom={theme.prompt.spaceBelow}>
        {flowers}
        <Box flexDirection="row" marginY={theme.prompt.spaceInside}>
          <Box flexShrink={0}>
            <Text color={chevron.color}>{chevron.glyph + ' '}</Text>
          </Box>
          <Box flexGrow={1} flexShrink={1}>
            <Text>{e.props.text}</Text>
          </Box>
        </Box>
        {flowers}
      </Box>
    )
  })

  // A collapsed group of tool calls as one line: a purple flower and what the
  // calls did. An expanded group keeps the engine's rows (drawn below).
  on('ui.render', { component: 'ToolGroup' }, ($, e, next) => {
    if (e.props.isExpanded || e.props.calls.length === 0) {
      return next(e)
    }
    const { Text } = $.ui.resolve(e)
    const { summary, running, failed } = theme.tools
    const isRunning = e.props.calls.some(c => c.isRunning)
    const mark = isRunning ? running : summary
    const failedCount = failures(e.props.calls)
    return (
      <Text>
        <Text color={mark.color}>{mark.glyph + ' '}</Text>
        <Text color={summary.color}>{groupSummary(e.props.calls) + (isRunning ? '…' : '')}</Text>
        {failedCount > 0 && <Text color={failed.color}>{` · ${failedCount} failed`}</Text>}
      </Text>
    )
  })

  // A tool call's header: its status mark, its name and what it was about.
  // The result under it stays the engine's own row; an interrupted call
  // keeps the engine's drawing, which says so.
  on('ui.render', { component: 'ToolUse' }, ($, e, next) => {
    if (e.props.isInterrupted) {
      return next(e)
    }
    const { Text } = $.ui.resolve(e)
    const { done, running, failed, name } = theme.tools
    const mark = e.props.isRunning ? running : e.props.isErrored ? failed : done
    const header = callHeader(e.props.tool, e.props.input)
    const chip = theme.chips.file
    return (
      <Text>
        <Text color={mark.color}>{mark.glyph + ' '}</Text>
        <Text weight="bold" color={name}>
          {header.name}
        </Text>
        {header.subject !== '' && <Text dimColor>{' '}</Text>}
        {header.subject !== '' &&
          (header.isPath ? (
            <Text color={chip.color} backgroundColor={chip.background}>
              {header.subject}
            </Text>
          ) : (
            <Text dimColor>{header.subject}</Text>
          ))}
      </Text>
    )
  })

  // "Cooked for 1m 42s" with a flower in front.
  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return (
      <Text dimColor>
        <Text color={theme.turn.color}>{theme.turn.glyph}</Text> {e.props.word} for {duration(e.props.durationMs)}
      </Text>
    )
  })
}

/** 3s, 1m 4s or 1h 2m, as the engine writes a turn's length. */
function duration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) {
    return `${s}s`
  }
  if (s < 3600) {
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}
