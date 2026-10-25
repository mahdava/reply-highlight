// Reads the inline markdown of one line (code, bold, italic) into runs the
// mod draws itself, with the words in its prose marked by kind.

import { type Kind, kindOf, marks } from './highlight'

export type Run = { text: string; kind?: Kind; bold?: boolean; italic?: boolean }

// `code`, **bold** and *italic*; an asterisk inside a word is left alone.
const INLINE = /(`+)(.*?)\1|\*\*([^*]+)\*\*|(?<![\w*])\*([^*\s](?:[^*]*[^*\s])?)\*(?![\w*])/g

/** One line's text as styled runs, in order. */
export function runs(text: string): Run[] {
  const out: Run[] = []
  let at = 0
  for (const m of text.matchAll(INLINE)) {
    out.push(...marks(text.slice(at, m.index)))
    if (m[1]) {
      const code = m[2].trim()
      out.push({ text: code, kind: kindOf(code) })
    } else if (m[3] !== undefined) {
      out.push({ text: m[3], bold: true })
    } else {
      out.push({ text: m[4], italic: true })
    }
    at = m.index + m[0].length
  }
  out.push(...marks(text.slice(at)))
  return out
}
