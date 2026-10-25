import type { Register } from 'claude-code'

import type { Kind } from './highlight'
import { runs } from './inline'
import { layout } from './layout'

// Theme keys, so the colours follow the person's light or dark theme.
const HEADING_COLOR = 'claude'
// The theme's green, picked from four trial greens for being easy to read.
const LABEL_COLOR = 'success'

// Bullets drawn as a small flower; numbered items keep their numbers. One
// cell wide, unlike a flower emoji, so the text after it stays in line.
const BULLET = '✿'
// the yellow of "auto mode on" in the prompt footer
const BULLET_COLOR = 'warning'

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
      const [, indent, sign, space] = /^(\s*)([-*+])(\s+)$/.exec(marker) ?? []
      if (sign === undefined) {
        return <Text>{marker}</Text>
      }
      return (
        <Text>
          {indent}
          <Text color={BULLET_COLOR}>{BULLET}</Text>
          {space}
        </Text>
      )
    }

    // A table with dim lines, a green header and the cells drawn as prose.
    // Columns start as wide as their longest cell and shrink together, wrapping,
    // when the window is narrower.
    const table = (head: string[], rows: string[][]) => {
      const widths = head.map((h, i) =>
        Math.max(h.length, ...rows.map(r => runs(r[i]).reduce((n, run) => n + run.text.length, 0)), 1),
      )
      const dim = (text: string) => (
        <Box flexShrink={0}>
          <Text dimColor>{text}</Text>
        </Box>
      )
      const row = (draw: (i: number) => unknown, left: string, middle: string, right: string) => (
        <Box flexDirection="row">
          {dim(left)}
          {widths.flatMap((w, i) => [
            <Box width={w} flexShrink={1}>
              {draw(i)}
            </Box>,
            dim(i < widths.length - 1 ? middle : right),
          ])}
        </Box>
      )
      const rule = (left: string, middle: string, right: string) =>
        row(
          i => (
            <Text dimColor wrap="truncate">
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
          {rows.map(r => row(i => prose(r[i]), '│ ', ' │ ', ' │'))}
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
                <Text weight="bold" color={HEADING_COLOR}>
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
}
