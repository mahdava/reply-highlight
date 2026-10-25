import type { Register } from 'claude-code'

import type { Kind } from './highlight'
import { runs } from './inline'
import { layout } from './layout'

// Theme keys, so the colours follow the person's light or dark theme.
const HEADING_COLOR = 'claude'
// ### and smaller: a softer orange, so the levels read apart.
const SUBHEADING_COLOR = '#d9a27c'
// The theme's green, picked from four trial greens for being easy to read.
const LABEL_COLOR = 'success'

// Bullets drawn as a small flower, and numbers in the same yellow. One
// cell wide, unlike a flower emoji, so the text after it stays in line.
const BULLET = '✿'
// the yellow of "auto mode on" in the prompt footer
const BULLET_COLOR = 'warning'

// Table lines in a dark yellow that barely stands out from the black.
const LINE_COLOR = '#37311a'
// Odd body rows sit on a faintly lighter background, so rows are easy to follow.
const STRIPE_COLOR = '#131313'

// Quotes: a purple bar on the left, the colour labels had before green.
const QUOTE_COLOR = 'merged'
// Code blocks: the language in a muted yellow over the stripe's background.
const CODE_LABEL_COLOR = '#8f7f45'

// Your own prompts between two full-width rows of leaves and flowers, in
// muted green and pink that sit back into the black, behind a yellow
// chevron: easy to find when scrolling back.
const PROMPT_ROW = [
  { glyph: '❧', color: '#3f6a49' },
  { glyph: BULLET, color: '#7a4d63' },
]
const PROMPT_CHEVRON = '❯'

// Each kind of marked word as a small chip. A mod is not told the theme, so
// these are raw colours picked for the dark theme.
const CHIPS: Record<Kind, { color: string; backgroundColor: string }> = {
  file: { color: '#8fd6c9', backgroundColor: '#17312d' },
  hash: { color: '#f5dc6e', backgroundColor: '#33300f' },
  code: { color: '#f4a6cb', backgroundColor: '#3a2131' },
}

// Rewrites only what the transcript draws for a reply; the stored message
// and what the model reads stay as they were.
export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const blocks = layout(e.props.text)
    if (blocks.every(b => b.kind === 'markdown')) {
      return next({ ...e, props: { ...e.props, text: blocks.map(b => b.text).join('\n\n') } })
    }

    const { Box, Markdown, Text } = $.ui.resolve(e)

    const prose = (text: string) => (
      <Text>
        {runs(text).map(r => (
          <Text weight={r.bold ? 'bold' : undefined} italic={r.italic} {...(r.kind ? CHIPS[r.kind] : {})}>
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
          <Text color={BULLET_COLOR}>{/\d/.test(sign) ? sign : BULLET}</Text>
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
          <Text color={LINE_COLOR}>{text}</Text>
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
            <Text color={LINE_COLOR} wrap="truncate">
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
              <Text weight="bold" color={LABEL_COLOR}>
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
            row(i => prose(r[i]), '│ ', ' │ ', ' │', n % 2 === 0 ? STRIPE_COLOR : undefined),
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
                <Text weight="bold" color={b.level <= 2 ? HEADING_COLOR : SUBHEADING_COLOR}>
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
                    <Text weight="bold" color={LABEL_COLOR}>
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
                  <Text color={LINE_COLOR}>{'── '}</Text>
                  <Text color={CODE_LABEL_COLOR}>{b.lang || 'code'}</Text>
                  <Text color={LINE_COLOR}>{' ' + '─'.repeat(20)}</Text>
                </Text>
                <Box backgroundColor={STRIPE_COLOR}>
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
                      <Text color={QUOTE_COLOR}>{'▎ '}</Text>
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
    // More flowers than any window is wide, in a box one row high that hides
    // the rest: the row fills the width and never wraps onto a second line,
    // however the terminal is resized.
    const flowers = (
      <Box height={1} overflow="hidden">
        <Text>
          {Array.from({ length: 200 }, (_, i) => (
            <Text color={PROMPT_ROW[i % PROMPT_ROW.length].color}>{PROMPT_ROW[i % PROMPT_ROW.length].glyph + ' '}</Text>
          ))}
        </Text>
      </Box>
    )
    return (
      <Box flexDirection="column" marginTop={1}>
        {flowers}
        <Box flexDirection="row" marginY={1}>
          <Box flexShrink={0}>
            <Text color={BULLET_COLOR}>{PROMPT_CHEVRON + ' '}</Text>
          </Box>
          <Box flexGrow={1} flexShrink={1}>
            <Text>{e.props.text}</Text>
          </Box>
        </Box>
        {flowers}
      </Box>
    )
  })

  // "Cooked for 1m 42s" with a flower in front, in the flower's yellow.
  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return (
      <Text dimColor>
        <Text color={BULLET_COLOR}>{BULLET}</Text> {e.props.word} for {duration(e.props.durationMs)}
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
