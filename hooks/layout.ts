// Splits a reply into the lines the mod draws itself (headings and list items
// that open with a label) and the markdown in between, which the terminal
// keeps drawing as it always does.

import { highlight } from './highlight'

// `gap`: a blank line stood before the block, so the drawing keeps the space.
export type Block = { gap: boolean } & (
  | { kind: 'markdown'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'item'; marker: string; label: string; rest: string; width: number }
)

const FENCE = /^\s*(```|~~~)/
const INDENTED = /^\s+\S/

// Labels up to this many characters share one column; a longer one keeps its
// own width so the column never eats the room the text needs.
const COLUMN_MAX = 24
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

    const last = blocks[blocks.length - 1]
    if (!inFence && !item && pending.length === 0 && last?.kind === 'item' && INDENTED.test(line)) {
      // a wrapped or continued item line: it belongs under the item's text
      last.rest += '\n' + highlight(line.trim())
    } else if (heading) {
      flush()
      blocks.push({ kind: 'heading', gap: blocks.length > 0, text: plain(heading[1]) })
    } else if (item && label && label.trim().split(/\s+/).length <= 6) {
      flush()
      const text = plain(label)
      blocks.push({ kind: 'item', gap: blankBefore, marker: item[1], label: text, rest: highlight(item[4]), width: 0 })
    } else {
      pending.push(line)
    }
    blankBefore = line.trim() === ''
  }
  flush()
  alignLabels(blocks)

  return blocks
}

/**
 * Gives each run of items next to each other one label column, as wide as its
 * longest label plus ": ", so the text after the labels lines up like a table.
 */
function alignLabels(blocks: Block[]): void {
  let run: Extract<Block, { kind: 'item' }>[] = []
  const close = () => {
    const fits = run.map(b => b.label.length + 2).filter(w => w <= COLUMN_MAX + 2)
    const column = Math.max(0, ...fits)
    for (const b of run) {
      b.width = Math.max(column, b.label.length + 2)
    }
    run = []
  }
  for (const b of blocks) {
    if (b.kind === 'item') {
      run.push(b)
    } else {
      close()
    }
  }
  close()
}

/** A heading or label as plain words: the drawing styles it, not markdown. */
function plain(text: string): string {
  return text.replace(/\*\*|__|`/g, '').trim()
}
