#!/usr/bin/env node
// Checks the theme designer before it is published: Netlify runs this as the
// build, and a failure keeps the last good page online. Run it before a push:
//
//   node scripts/check-designer.mjs
//
// 1. Every HTML tag that is opened is closed, in order.
// 2. The page's script parses.
// 3. The designer's built-in look is the mod's DEFAULT_THEME in hooks/theme.ts.
// 4. Where a Chromium is found (CHROME, or Playwright's download), the page is
//    opened headless: no script errors, the whole-session preview and the
//    command sit in the side column, every step draws its preview, and every
//    setting outlines something when pointed at.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// DESIGNER_PAGE checks another copy of the page, as when trying the checks on a broken one.
const page = readFileSync(process.env.DESIGNER_PAGE ?? join(root, 'designer/index.html'), 'utf8')
const problems = []
const lineOf = index => page.slice(0, index).split('\n').length

// ── 1. Tags ──────────────────────────────────────────────────────────────
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
// Script and style bodies are not HTML; their contents are blanked, keeping offsets.
const markup = page.replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, _tag, body, close) => open + body.replace(/[^\n]/g, ' ') + close)
  .replace(/<!--[\s\S]*?-->/g, c => c.replace(/[^\n]/g, ' '))
const open = []
for (const m of markup.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g)) {
  const [, closing, raw, selfClosing] = m
  const tag = raw.toLowerCase()
  if (VOID.has(tag) || selfClosing || tag === '!doctype') continue
  if (!closing) { open.push({ tag, line: lineOf(m.index) }); continue }
  const top = open.at(-1)
  if (top?.tag === tag) { open.pop(); continue }
  problems.push(`designer/index.html:${lineOf(m.index)}: </${tag}> closes nothing open` + (top ? ` (the last open tag is <${top.tag}> from line ${top.line})` : ''))
  break
}
for (const t of open.filter(t => t.tag !== 'html')) problems.push(`designer/index.html:${t.line}: <${t.tag}> is never closed`)

// ── 2. Script ────────────────────────────────────────────────────────────
const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)]
if (scripts.length === 0) problems.push('designer/index.html: no script')
for (const s of scripts) {
  try {
    new vm.Script(s[1], { filename: 'designer/index.html', lineOffset: lineOf(s.index) - 1 })
  } catch (e) {
    problems.push(`designer/index.html: the script does not parse: ${e.message} (${String(e.stack).split('\n')[0]})`)
  }
}

// ── 3. The built-in look ─────────────────────────────────────────────────
const objectAfter = (text, start, file) => {
  const at = text.indexOf(start)
  if (at < 0) { problems.push(`${file}: no ${start}`); return undefined }
  const from = text.indexOf('{', at)
  let depth = 0
  for (let i = from; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return vm.runInNewContext(`(${text.slice(from, i + 1)})`)
  }
  problems.push(`${file}: ${start} is never closed`)
}
const mod = objectAfter(readFileSync(join(root, 'hooks/theme.ts'), 'utf8'), 'export const DEFAULT_THEME', 'hooks/theme.ts')
const designer = objectAfter(page, 'const DEFAULT_THEME', 'designer/index.html')
if (mod && designer && !isDeepStrictEqual(JSON.parse(JSON.stringify(mod)), JSON.parse(JSON.stringify(designer)))) {
  problems.push("designer/index.html: DEFAULT_THEME differs from the mod's in hooks/theme.ts")
}

// ── 4. In a browser ──────────────────────────────────────────────────────
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME
  const base = join(homedir(), '.cache/ms-playwright')
  if (!existsSync(base)) return undefined
  for (const dir of readdirSync(base).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
    const bin = join(base, dir, 'chrome-headless-shell-linux64/chrome-headless-shell')
    if (existsSync(bin)) return bin
  }
}
const chrome = findChrome()
if (problems.length === 0 && chrome) {
  // Errors are caught from the first script on; the checks run once the page has drawn.
  const probe = `<script>window.__errors = []; addEventListener('error', e => __errors.push(e.message));</script>`
  // In a function of its own: the page's top-level names (steps, state) are taken.
  const checks = `<script>(() => {
    const found = [...window.__errors];
    const stage = document.querySelector('.stage');
    if (!stage?.querySelector('#term')?.children.length) found.push('the whole-session preview is not in the side column, or is empty');
    if (!stage?.querySelector('.out #cmd')) found.push('the command box is not in the side column');
    const steps = document.querySelectorAll('.step');
    if (steps.length !== 9) found.push('expected 9 steps, found ' + steps.length);
    steps.forEach(s => { if (!s.querySelector('.term')?.children.length) found.push(s.id + ' draws no preview'); });
    document.querySelectorAll('.field[data-spot]').forEach(f => {
      if (!document.querySelector('.term [data-path="' + f.dataset.spot + '"]')) found.push('the setting for ' + f.dataset.spot + ' outlines nothing');
    });
    // Split, so the dumped page holds the marker only where the result is.
    document.body.insertAdjacentHTML('beforeend', '<pre id="__' + 'check">' + JSON.stringify(found) + '</pre>');
  })();</script>`
  const dir = mkdtempSync(join(tmpdir(), 'designer-check-'))
  try {
    const file = join(dir, 'index.html')
    writeFileSync(file, page.replace('<title>', probe + '<title>') + checks)
    const dom = execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=3000', '--dump-dom', `file://${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const result = /<pre id="__check">([\s\S]*?)<\/pre>/.exec(dom)
    if (!result) problems.push('designer/index.html: the page stopped before its checks ran')
    else for (const p of JSON.parse(result[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))) problems.push(`designer/index.html in a browser: ${p}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (problems.length > 0) {
  console.error('The designer is not ready to publish:\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log(`The designer checks out${chrome ? ', in a browser too' : ' (no Chromium here, so not opened in a browser)'}.`)
