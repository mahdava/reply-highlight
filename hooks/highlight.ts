// Marks key words in a reply's markdown so the terminal draws them in a
// colour: wrapped as inline code, which the transcript already colours.
// Only prose is touched; anything that already has a meaning in markdown
// (code, links, tables, headings) is left exactly as written.

const FENCE = /^\s*(```|~~~)/
const TABLE_ROW = /^\s*\|/
const HEADING = /^\s{0,3}#{1,6}\s/

// Spans inside a line that must not change: inline code, links, URLs and
// text that is already bold.
const PROTECTED = /(`+)[^`]*?\1|\[[^\]]*\]\([^)]*\)|<https?:[^>]+>|https?:\/\/\S+|\*\*[^*]+\*\*/g

const EXTENSIONS = 'ts|tsx|js|jsx|mjs|cjs|json|md|go|sql|py|sh|yaml|yml|toml|css|html|txt|lock'

// What gets marked, as one alternation so two kinds never overlap.
const MARKED = new RegExp(
  [
    // a path: one or more folders, optionally :line or :line-line
    String.raw`(?:~|\.{1,2})?\/?(?:[\w@.-]+\/)+[\w.@-]*[\w@-](?::\d+(?:-\d+)?)?`,
    // a file name with a known extension
    String.raw`\b[\w.-]+\.(?:${EXTENSIONS})(?::\d+(?:-\d+)?)?\b`,
    // a commit hash: 7 to 40 hex characters with at least one digit and one letter
    String.raw`\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b`,
    // a call: a name straight before its brackets, with short arguments
    String.raw`\b[A-Za-z_$][\w$.]*\([^()\n]{0,60}\)`,
    // CONSTANT_CASE with at least one underscore
    String.raw`\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b`,
    // snake_case and dotted.names with an underscore or a capital inside
    String.raw`\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b`,
    // camelCase (two lowercase letters, then a capital: "iPhone" stays a word), dotted parts allowed
    String.raw`\b[a-z][a-z0-9]+[A-Z][\w$]*(?:\.[A-Za-z_$][\w$]*)*\b`,
  ].join('|'),
  'g',
)

/** A reply's markdown with its key words marked for the terminal to colour. */
export function highlight(text: string): string {
  let inFence = false

  return text
    .split('\n')
    .map(line => {
      if (FENCE.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence || TABLE_ROW.test(line) || HEADING.test(line)) {
        return line
      }
      return markLine(line)
    })
    .join('\n')
}

/** Marks the prose of one line, stepping around its protected spans. */
function markLine(line: string): string {
  let out = ''
  let at = 0
  for (const span of line.matchAll(PROTECTED)) {
    out += markProse(line.slice(at, span.index)) + span[0]
    at = span.index + span[0].length
  }
  return out + markProse(line.slice(at))
}

function markProse(prose: string): string {
  return prose.replace(MARKED, word => (isWordWithSlash(word) ? word : `\`${word}\``))
}

// "and/or" and "TCP/IP" have a slash but are words, not paths: a path needs
// a leading ~ . or /, a file extension, a line number or two slashes, and a
// branch name ("feat/gris-652-pr-recap") a lowercase prefix and a hyphenated name.
function isWordWithSlash(word: string): boolean {
  if (!word.includes('/')) {
    return false
  }
  const hasAnchor = /^(~|\.{1,2}\/|\/)/.test(word)
  const hasExtension = /\.[A-Za-z]{1,5}(?::\d+(?:-\d+)?)?$/.test(word)
  const hasLine = /:\d+(?:-\d+)?$/.test(word)
  const isBranch = /^[a-z]+\/[\w.]+-[\w.-]+$/.test(word)
  const slashes = word.split('/').length - 1
  return !(hasAnchor || hasExtension || hasLine || isBranch || slashes >= 2)
}
