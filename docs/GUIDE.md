# Using Reply Highlight

This guide covers what Reply Highlight draws: each part of a reply, your own
prompts and the line that ends a turn, what it leaves to the terminal, and
its limits. Back to the [README](../README.md).

## How it works

Claude Code draws each reply from its markdown. Reply Highlight hooks that
drawing (the `ui.render` event for `AssistantMessage`), splits the reply into
parts and draws most of them itself. The text Claude wrote is never changed:
only what appears on your screen is.

A reply is split line by line into:

- **Headings**, lines starting with `#`.
- **List items**, lines starting with `-`, `*`, `+` or a number. An item
  whose text opens with a short label (up to six words) followed by a colon
  is a labelled item.
- **Paragraphs**, the other lines of text.
- **Tables**, a header line, a `|---|` line and the rows under them.
- **Quotes**, lines starting with `>`.
- **Code blocks**, from one ```` ``` ```` or `~~~` line to the next.
- **Everything else**, left to the terminal, as below.

## The reply

### Headings

`#` and `##` headings are bold, in the theme's Claude orange. `###` and
smaller are bold in a softer orange, so the levels of a long reply read
apart.

### Lists

A bullet (`-`, `*` or `+`) is drawn as a yellow ✿, in the theme's colour for
"auto mode on". A number keeps its number, in the same yellow. Nested items
keep their indent.

A labelled item draws its label in bold, in the theme's green, followed by a
colon. All three ways of writing a label are read:

```
- **Label:** text
- **Label**: text
- Label: text
```

Labelled items next to each other share one label column, as wide as the
longest label, so the text after the labels lines up like a table. A label
longer than 24 characters keeps its own width, so the column never takes the
room the text needs. An indented line under an item stays under the item's
text.

List items get one empty row between them. A terminal has no half rows, so
one row is the smallest gap.

### Words in colour

In paragraphs, list items, table cells and quotes, three kinds of words get
a colour on a background of the same tone, like a small chip:

| Kind | Examples | Colour |
| --- | --- | --- |
| File names and paths | `hooks/layout.ts`, `README.md`, `src/app.ts:42`, `~/.claude`, `feat/gris-1-name` | Teal |
| Commit hashes | `a782c71`, 7 to 40 hex characters with at least one digit and one letter | Yellow |
| Names from code | `layout()`, `lastSeen`, `OPENCLAW_COAUTHOR`, `approval_timeout_seconds` | Pink |

Text Claude already wrote as `inline code` gets the colour of its kind too.
Words that only look like code stay plain: `and/or`, `TCP/IP`, `iPhone`,
`deadbeef` (hex without a digit), and dotted names such as `e.props.text`.

Bold and italic text keep their style.

### Tables

A table is drawn with lines between every cell and every row, in a dark
yellow that barely stands out from the black. The header row is bold, in the
labels' green, and every other body row, starting with the first, sits on a
faintly lighter stripe. Cells use the word colours above.

Each column starts as wide as its longest cell. In a window too narrow for
the whole table the columns shrink together and their text wraps.

### Quotes

Each line of a quote gets a purple bar on its left, in the theme's colour
for merged pull requests.

### Code blocks

A code block gets a faint line above it naming its language (`code` when the
block names none) and a dark background behind it. The terminal still draws
the code, so its syntax colours stay.

## Your prompts

A prompt you typed is drawn with a yellow `❯` in front, between two rows of
❦ leaves and ✿ flowers, in a muted green and pink, with an empty row between
each row and the text. The rows fill the width of the terminal and never
wrap onto a second line when the window is resized: each holds more symbols
than any window is wide, in a box one row tall that hides the rest.

Messages from other agents and notifications keep Claude Code's own drawing.

## The end of a turn

The line that ends a turn ("Cooked for 1m 42s") gets a yellow ✿ in front,
and the rest is dimmed.

## What stays with the terminal

These parts are drawn by Claude Code as before:

- **Lines and tables with a link**, so the links stay clickable.
- **Rules** (`---`) and lines of HTML.
- **A reply with nothing the mod draws**, such as one made only of code
  blocks, is handed back whole.

## Limits

- **The colours are fixed.** A mod is not told which theme is in use. The
  theme keys (orange, green, yellow, purple) follow the theme; the chips,
  table lines, stripe and prompt rows are raw colours picked for the dark
  theme and look heavy in a light one.
- **Only the terminal is styled.** The desktop app, VS Code and the mobile
  app use their own drawing of a reply.
- **Tool lines and the spinner are not styled.** Every tool draws its line
  its own way, and a mod can change the spinner's word but not its symbol.
- **Long prompts are drawn in full.** The mod draws every prompt you typed
  whole, including a long paste.
- **Wrapped table cells** can leave gaps in the side lines on the rows
  under the first.
- **Rarer inline markdown** inside the parts the mod draws, such as
  strikethrough, is sent to the terminal instead; underscores for italic are
  left as written.
