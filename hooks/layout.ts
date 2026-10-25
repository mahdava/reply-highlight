// Splits a reply into the parts the mod draws itself (headings, paragraphs and
// list items) and the markdown it leaves to the terminal (code blocks, tables,
// quotes, rules and lines with links, which stay pressable that way).

import { highlight } from './highlight'

// `gap`: a blank line stood before the block, so the drawing keeps the space.
// An item's `label` is '' when it opens without one.
export type Block = { gap: boolean } & (
  | { kind: 'markdown'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'item'; marker: string; label: string; rest: string; width: number }
)

const FENCE = /^\s*(```|~~~)/
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/
const INDENTED = /^\s+\S/
const LIST = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/
const ENGINE_DRAWS = /^\s*[|><]|^\s*([-*_])(\s*\1){2,}\s*$|\[[^\]]*\]\(|<https?:|~~/

// "- **Label:** rest", "- **Label**: rest" or "- Label: rest", at any indent.
const ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+)(?:\*\*([^*\n]{1,60}?):?\*\*:?|([^:`*[\n]{2,40}?):)(?=\s|$)\s*(.*)$/

// Labels up to this many characters share one column; a longer one keeps its
// own width so the column never eats the room the text needs.
const COLUMN_MAX = 24

/** The reply as blocks, in order; markdown blocks already highlighted. */
export function layout(text: string): Block[] {
  const blocks: Block[] = []
  let pending: string[] = []
  let pendingGap = false
  let inFence = false
  let blankBefore = false

  const flush = () => {
    if (pending.length > 0) {
      blocks.push({ kind: 'markdown', gap: pendingGap, text: highlight(pending.join('\n')) })
    }
    pending = []
  }

  for (const line of text.split('\n')) {
    const fence = FENCE.test(line)
    if (fence || inFence || ENGINE_DRAWS.test(line)) {
      if (pending.length === 0) {
        pendingGap = blankBefore && blocks.length > 0
      }
      pending.push(line)
      inFence = fence ? !inFence : inFence
      blankBefore = false
      continue
    }
    if (line.trim() === '') {
      flush()
      blankBefore = true
      continue
    }

    flush()
    const gap = blankBefore && blocks.length > 0
    blankBefore = false
    const last = blocks[blocks.length - 1]
    const heading = HEADING.exec(line)
    const list = LIST.exec(line)

    if (heading) {
      blocks.push({ kind: 'heading', gap: blocks.length > 0, text: plain(heading[1]) })
    } else if (list) {
      const item = ITEM.exec(line)
      const label = item?.[2] ?? item?.[3]
      if (item && label && label.trim().split(/\s+/).length <= 6) {
        blocks.push({ kind: 'item', gap, marker: item[1], label: plain(label), rest: item[4], width: 0 })
      } else {
        blocks.push({ kind: 'item', gap, marker: list[1], label: '', rest: list[2], width: 0 })
      }
    } else if (!gap && last?.kind === 'item' && INDENTED.test(line)) {
      // a continued item line: it belongs under the item's text
      last.rest += '\n' + line.trim()
    } else if (!gap && last?.kind === 'para') {
      last.text += '\n' + line
    } else {
      blocks.push({ kind: 'para', gap, text: line })
    }
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
    if (b.kind !== 'item') {
      close()
    } else if (b.label !== '') {
      run.push(b)
    }
  }
  close()
}

/** A heading or label as plain words: the drawing styles it, not markdown. */
function plain(text: string): string {
  return text.replace(/\*\*|__|`/g, '').trim()
}
