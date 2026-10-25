import type { Register } from 'claude-code'

import { highlight } from './highlight'
import { layout } from './layout'

// Theme keys, so the colours follow the person's light or dark theme.
const HEADING_COLOR = 'claude'
// Purple, so labels stand apart from the blue of paths and code names.
const LABEL_COLOR = 'merged'

// Rewrites only what the transcript draws for a reply; the stored message
// and what the model reads stay as they were.
export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    const blocks = layout(e.props.text)
    if (blocks.every(b => b.kind === 'markdown')) {
      return next({ ...e, props: { ...e.props, text: highlight(e.props.text) } })
    }

    const { Box, Markdown, Text } = $.ui.resolve(e)

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
                <Box width={b.width} flexShrink={0}>
                  <Text weight="bold" color={LABEL_COLOR}>
                    {b.label}:
                  </Text>
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  <Markdown text={b.rest} />
                </Box>
              </Box>
            )
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
