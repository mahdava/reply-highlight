# Developing Reply Highlight

The plugin is a Claude Code mod: a hooks module that runs inside Claude
Code's own plugin environment, with no Node APIs. Back to the
[README](../README.md).

It reads a reply in two steps. `layout()` splits the reply's markdown into
blocks, and `runs()` splits a line of text into styled pieces. Both are
plain functions with no engine calls, so the tests drive them directly.
`register.tsx` draws the blocks with the terminal's elements, in the colours
and symbols of the theme in use.

| File | Holds |
| --- | --- |
| `hooks/register.tsx` | The hooks and the drawing: replies, tables, code blocks, quotes, your prompts, tool rows and the end-of-turn line; reading the saved theme at session start and the `/reply-highlight` command |
| `hooks/theme.ts` | The theme: its shape, the built-in look (`DEFAULT_THEME`), `readTheme()`, which checks a saved theme value by value, and `changes()`, what a theme changes |
| `hooks/tools.ts` | The words of tool rows: `groupSummary()` and `callHeader()` |
| `hooks/layout.ts` | `layout()`: a reply as headings, paragraphs, list items (with their label column), tables, quotes, code blocks and the markdown left to the terminal |
| `hooks/inline.ts` | `runs()`: one line's inline code, bold, italic and marked words as styled pieces |
| `hooks/highlight.ts` | Which words are links, files, commit hashes or names from code (`marks()`, `kindOf()`), and `highlight()`, which marks them as inline code in the markdown left to the terminal |
| `hooks/hooks.json` | Names the hooks module |
| `tests/layout.test.ts` | Splitting a reply into blocks, labels, tables, quotes and code blocks |
| `tests/inline.test.ts` | Styled pieces and word kinds |
| `tests/highlight.test.ts` | Which words are marked, and what is left as written |
| `tests/theme.test.ts` | Reading a saved theme, and what it changes |
| `tests/command.test.ts` | `/reply-highlight` against a home folder in memory |
| `tests/tools.test.ts` | Tool row words |
| `tests/drawing.test.tsx` | Claude Code accepts the drawing of a reply and of tool rows |
| `designer/index.html` | The theme designer, published as an artifact from this file. Its copy of the built-in look and the value rules must match `hooks/theme.ts`. |
| `LICENSE` | The MIT License, for the code and documentation |
| `.claude-plugin/plugin.json` | The manifest |
| `.claude-plugin/marketplace.json` | Makes the repository its own marketplace |
| `docs/` | The guide, install, troubleshooting and this page, linked from the README |

To change the built-in look, edit `DEFAULT_THEME` in `hooks/theme.ts` and
the same object in `designer/index.html`, then publish the designer again. A
theme key (`'claude'`, `'success'`, `'warning'`, `'merged'`) follows the
person's theme; a `#rrggbb` colour does not. The designer's preview uses
Claude Code's dark and light theme colours for the keys, read from Claude
Code itself; refresh `PALETTES` there when Claude Code's themes change.

Checks:

```
claude plugin validate .
claude plugin test .
```

`claude plugin validate` reads the manifest, the marketplace file and the
module, and reports anything Claude Code would refuse. `claude plugin test`
runs the tests inside Claude Code's own plugin host.

Type-checking uses the API types that Claude Code writes into
`.claude-plugin/types/` when a session loads the plugin from a local folder,
as with `--plugin-dir` below. That folder is git-ignored. Once it exists:

```
npx -p typescript tsc -p .
```

Don't run that before the folder exists. The mod's `tsconfig.json` extends
`.claude-plugin/types/tsconfig.json`, which is what turns off output, so
without it `tsc` reports errors for every API call and writes a `.js` copy
next to every source file.

To work on a local copy, start a session with the folder loaded:

```
claude --plugin-dir /path/to/reply-highlight
```

Edits reload when the turn that made them ends, and the replies already on
screen are drawn again. An installed copy picks up changes with
`/reload-plugins`.

Bump `version` in `.claude-plugin/plugin.json` with each change meant to
reach installs.
