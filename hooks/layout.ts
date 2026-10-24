// Splits a reply into the lines the mod draws itself (headings and list items
// that open with a label) and the markdown in between, which the terminal
// keeps drawing as it always does.

import { highlight } from './highlight'

// `gap`: a blank line stood before the block, so the drawing keeps the space.
export type Block = { gap: boolean } & (
  | { kind: 'markdown'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'item'; marker: string; label: string; rest: string }
)

const FENCE = /^\s*(```|~~~)/
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/

// "- **Label:** rest", "- **Label**: rest" or "- Label: rest", at any indent.
const ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+)(?:\*\*([^*\n]{1,60}?):?\*\*:?|([^:`*[\n]{2,40}?):)(?=\s|$)\s*(.*)$/

/** The reply as blocks, in order; markdown blocks already highlighted. */
export function layout(text: string): Block[] {
  const blocks: Block[] = []
  let pending: string[] = []
  let inFence = false
  let blankBefore = false

  const flush = () => {
    const body = pending.join('\n')
    if (body.trim() !== '') {
      const gap = blocks.length > 0 && pending[0].trim() === ''
      blocks.push({ kind: 'markdown', gap, text: highlight(body.replace(/^\s*\n|\n\s*$/g, '')) })
    }
    pending = []
  }

  for (const line of text.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence
    }
    const heading = inFence ? null : HEADING.exec(line)
    const item = inFence ? null : ITEM.exec(line)
    const label = item?.[2] ?? item?.[3]

    if (heading) {
      flush()
      blocks.push({ kind: 'heading', gap: blocks.length > 0, text: plain(heading[1]) })
    } else if (item && label && label.trim().split(/\s+/).length <= 6) {
      flush()
      blocks.push({ kind: 'item', gap: blankBefore, marker: item[1], label: plain(label), rest: highlight(item[4]) })
    } else {
      pending.push(line)
    }
    blankBefore = line.trim() === ''
  }
  flush()

  return blocks
}

/** A heading or label as plain words: the drawing styles it, not markdown. */
function plain(text: string): string {
  return text.replace(/\*\*|__|`/g, '').trim()
}
