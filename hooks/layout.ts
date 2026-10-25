// Splits a reply into the parts the mod draws itself (headings, paragraphs,
// list items, tables, quotes and the frame of code blocks) and the markdown it
// leaves to the terminal (rules, HTML and lines with links, which stay
// pressable that way).

import { highlight } from './highlight'

// `gap`: a blank line stood before the block, so the drawing keeps the space.
// An item's `label` is '' when it opens without one.
export type Block = { gap: boolean } & (
  | { kind: 'markdown'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'item'; marker: string; label: string; rest: string; width: number }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'code'; lang: string; text: string }
)

const FENCE = /^\s*(```|~~~)/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const INDENTED = /^\s+\S/
const TABLE_ROW = /^\s*\|/
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const LINK = /\[[^\]]*\]\(|<https?:/
const LIST = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const ENGINE_DRAWS = /^\s*[|<]|^\s*([-*_])(\s*\1){2,}\s*$|\[[^\]]*\]\(|<https?:|~~/

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
  let code: Extract<Block, { kind: 'code' }> | null = null
  let blankBefore = false

  const flush = () => {
    const table = asTable(pending)
    if (table) {
      blocks.push({ kind: 'table', gap: pendingGap, ...table })
    } else if (pending.length > 0) {
      blocks.push({ kind: 'markdown', gap: pendingGap, text: highlight(pending.join('\n')) })
    }
    pending = []
  }

  for (const line of text.split('\n')) {
    const fence = FENCE.exec(line)
    if (code) {
      // the code block's own lines, its closing fence last; the terminal
      // still draws them, so their colours stay
      code.text += '\n' + line
      code = fence ? null : code
      continue
    }
    if (fence) {
      flush()
      const lang = line.trim().slice(fence[1].length).trim().split(/\s/)[0]
      code = { kind: 'code', gap: blankBefore && blocks.length > 0, lang, text: line }
      blocks.push(code)
      blankBefore = false
      continue
    }
    if (ENGINE_DRAWS.test(line)) {
      if (pending.length === 0) {
        pendingGap = blankBefore && blocks.length > 0
      }
      pending.push(line)
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
    const quote = QUOTE.exec(line)

    if (quote) {
      if (!gap && last?.kind === 'quote') {
        last.lines.push(quote[1])
      } else {
        blocks.push({ kind: 'quote', gap, lines: [quote[1]] })
      }
    } else if (heading) {
      blocks.push({ kind: 'heading', gap: blocks.length > 0, level: heading[1].length, text: plain(heading[2]) })
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
 * Lines that are all one plain table, as its header and rows; null for anything
 * else, or a table with a link in it, which the terminal keeps pressable.
 */
function asTable(lines: string[]): { head: string[]; rows: string[][] } | null {
  if (lines.length < 2 || !lines.every(l => TABLE_ROW.test(l)) || !TABLE_RULE.test(lines[1]) || lines.some(l => LINK.test(l))) {
    return null
  }
  const [head, , ...rows] = lines.map(cells)
  return { head: head.map(plain), rows: rows.map(r => head.map((_, i) => r[i] ?? '')) }
}

/** One table line's cells, trimmed; a pipe written as \| stays in its cell. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map(c => c.trim().replace(/\\\|/g, '|'))
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
