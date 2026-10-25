# Troubleshooting Reply Highlight

When replies look plain, wrong or broken, start here. Each question below is
something that has come up, with what causes it and what to do. Back to the
[README](../README.md).

## Why are replies not coloured at all?

The plugin is not loaded in this session. Run `/reload-plugins`, or start a
new session. `claude plugin list` should show `reply-highlight` as enabled.

## Why is one reply plain while the others are coloured?

Claude Code refused the mod's drawing of that reply and drew its own. In a
session that loads the mod from a local folder, the transcript shows a dim
line naming `reply-highlight` and the reason. Otherwise, start Claude Code
with `--debug` and look for a line containing `ui.render (AssistantMessage)`
and `does not validate`: it names the reason. Please open an issue with that
line and, if you can, the reply's text.

A reply made only of parts the terminal keeps, such as code blocks or lines
with links, is plain by design; see
[What stays with the terminal](GUIDE.md#what-stays-with-the-terminal).

## Why is my prompt not between the rows of leaves and flowers?

Only prompts you typed get the frame: messages from other agents and
notifications keep Claude Code's drawing. Before 1.0.0 a prompt was framed
only when Claude Code marked it as expanded, which it never does in the
normal view, so no prompt was framed. Update the plugin.

## Why do the colours look heavy or hard to read?

The built-in colours are picked for the dark theme, because a mod is not
told which theme is in use. In a light theme some look heavy or faint. Open the
[theme designer](https://reply-highlight.netlify.app/), start
from the Light terminal preset, and paste its command.

## Why did my theme not change everything I set?

A value that does not fit the rules keeps the built-in look, and the
`/reply-highlight theme` answer names each one: a colour must be `#rrggbb`
(colour names such as `claude` are no longer read, since 1.3.0), and a symbol one character one cell wide (no emoji).
See [Themes](GUIDE.md#themes). A theme file with a mistake in it is named in
a dim line when a session starts, and the built-in look is used.

## Why is there no `/reply-highlight` command?

The command came in 1.1.0. Update the plugin, then run `/reload-plugins`.

## Why does a word get a colour it should not have, or miss one?

The kinds are guessed from the word's shape: see
[Words in colour](GUIDE.md#words-in-colour) for the rules. A single word in
PascalCase (`NumberInput`) and plain numbers are not coloured. Please open an
issue with the sentence it got wrong.

## Why do a table's side lines have gaps?

A cell's text wrapped onto a second row because the window is narrower than
the table. The lines are drawn once per row, so the wrapped rows under the
first have no side line. Widen the window, or ask for a narrower table.

## Why is a symbol drawn as a box or a question mark?

The terminal's font has no glyph for ✿ or ❦. Pick a font that has them, or
add a symbol fallback font in the terminal's settings.
