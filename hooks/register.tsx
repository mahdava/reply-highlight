import type { Register } from 'claude-code'

import type { Kind } from './highlight'
import { runs } from './inline'
import { layout } from './layout'

// Theme keys, so the colours follow the person's light or dark theme.
const HEADING_COLOR = 'claude'
// Purple, so labels stand apart from the marked words.
const LABEL_COLOR = 'merged'

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
                  <Text>{b.marker}</Text>
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
