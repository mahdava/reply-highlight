// Every colour and symbol the mod draws with, as one plain object: the
// built-in look, and the overrides a person saves with /reply-highlight.
// The theme designer artifact writes the same shape.

/** A colour as `#rrggbb`. */
export type Color = string

/** A symbol and its colour. */
export type Mark = { glyph: string; color: Color }

/** A chip: a word's colour and the background behind it. */
export type Chip = { color: Color; background: Color }

export type Theme = {
  heading: Color
  subheading: Color
  label: Color
  bullet: Mark
  number: Color
  chips: { link: Chip; file: Chip; hash: Chip; code: Chip }
  table: { line: Color; header: Color; stripe: Color }
  quote: Mark
  code: { line: Color; label: Color; background: Color }
  prompt: { chevron: Mark; row: Mark[]; spaceAbove: number; spaceInside: number; spaceBelow: number }
  turn: Mark
  tools: { summary: Mark; done: Mark; running: Mark; failed: Mark; name: Color }
}

/** The look picked with Lucia, tuned for Claude Code's dark theme. */
export const DEFAULT_THEME: Theme = {
  heading: '#d77757',
  subheading: '#d9a27c',
  label: '#4eba65',
  // ✿ is one cell wide, unlike a flower emoji, so the text after it stays in line
  bullet: { glyph: '✿', color: '#ffc107' },
  number: '#ffc107',
  chips: {
    // links underlined in a soft blue, the whole address, so they read apart from files
    link: { color: '#9cb8ff', background: '#18203a' },
    file: { color: '#8fd6c9', background: '#17312d' },
    hash: { color: '#f5dc6e', background: '#33300f' },
    code: { color: '#f4a6cb', background: '#3a2131' },
  },
  table: { line: '#37311a', header: '#4eba65', stripe: '#131313' },
  quote: { glyph: '▎', color: '#af87ff' },
  code: { line: '#37311a', label: '#8f7f45', background: '#131313' },
  prompt: {
    chevron: { glyph: '❯', color: '#ffc107' },
    row: [
      { glyph: '❦', color: '#3f6a49' },
      { glyph: '✿', color: '#7a4d63' },
    ],
    spaceAbove: 2,
    spaceInside: 1,
    spaceBelow: 2,
  },
  turn: { glyph: '✿', color: '#ffc107' },
  // Tool rows: a collapsed group's line ("Ran 2 shell commands") in purple
  // behind a flower; each call's status mark orange when done, so it stands
  // out from the green success text of replies.
  tools: {
    summary: { glyph: '❀', color: '#af87ff' },
    done: { glyph: '●', color: '#d77757' },
    running: { glyph: '◌', color: '#ffc107' },
    failed: { glyph: '✕', color: '#ff6b80' },
    name: '#ffffff',
  },
}

const HEX = /^#[0-9a-fA-F]{6}$/
const MAX_SPACE = 4
const MAX_ROW = 8

/**
 * A saved theme read onto the built-in one: each value that checks out
 * replaces the built-in value, and every other one is named in `problems`.
 */
export function readTheme(saved: unknown): { theme: Theme; problems: string[] } {
  const problems: string[] = []
  const theme = merge(DEFAULT_THEME, saved, '', problems) as Theme
  return { theme, problems }
}

/** Only the values of `theme` that differ from the built-in look. */
export function changes(theme: unknown, base: unknown = DEFAULT_THEME): unknown {
  if (Array.isArray(theme) || typeof theme !== 'object' || theme === null) {
    return JSON.stringify(theme) === JSON.stringify(base) ? undefined : theme
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(theme)) {
    const changed = changes(value, (base as Record<string, unknown>)[key])
    if (changed !== undefined) {
      out[key] = changed
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function merge(base: unknown, saved: unknown, path: string, problems: string[]): unknown {
  if (saved === undefined) {
    return base
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(saved) || saved.length === 0 || saved.length > MAX_ROW) {
      problems.push(`${path}: a list of 1 to ${MAX_ROW} symbols`)
      return base
    }
    return saved.map((item, i) => merge(base[i % base.length], item, `${path}[${i}]`, problems))
  }
  if (typeof base === 'object' && base !== null) {
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) {
      problems.push(`${path || 'theme'}: an object`)
      return base
    }
    for (const key of Object.keys(saved)) {
      if (!(key in base)) {
        problems.push(`${join(path, key)}: not a part of the theme`)
      }
    }
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [
        key,
        merge(value, (saved as Record<string, unknown>)[key], join(path, key), problems),
      ]),
    )
  }
  const field = path.split('.').pop() ?? path
  if (typeof base === 'number') {
    if (Number.isInteger(saved) && (saved as number) >= 0 && (saved as number) <= MAX_SPACE) {
      return saved
    }
    problems.push(`${path}: a whole number from 0 to ${MAX_SPACE}`)
    return base
  }
  if (field.startsWith('glyph')) {
    if (isGlyph(saved)) {
      return saved
    }
    problems.push(`${path}: one character, one cell wide (no emoji)`)
    return base
  }
  if (isColor(saved)) {
    return saved
  }
  problems.push(`${path}: a colour as #rrggbb`)
  return base
}

function join(path: string, key: string): string {
  return path ? `${path}.${key}` : key
}

export function isColor(value: unknown): value is Color {
  return typeof value === 'string' && HEX.test(value)
}

// One code point outside the emoji and wide (East Asian) blocks, which most
// terminals draw two cells wide and which would push a row out of line.
export function isGlyph(value: unknown): value is string {
  if (typeof value !== 'string' || [...value].length !== 1) {
    return false
  }
  const cp = value.codePointAt(0) ?? 0
  const wide = (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) || cp >= 0x1f000
  return cp >= 0x20 && !(cp >= 0x7f && cp < 0xa0) && !wide
}
