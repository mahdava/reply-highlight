import type { Register } from 'claude-code'

import { highlight } from './highlight'

// Rewrites only what the transcript draws for a reply; the stored message
// and what the model reads stay as they were.
export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, text: highlight(e.props.text) } }),
  )
}
