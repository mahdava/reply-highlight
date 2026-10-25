# ✿ Reply Highlight

## What is Reply Highlight?

Reply Highlight is a Claude Code mod, a plugin that runs inside Claude Code,
that colours Claude's replies in the terminal so long replies are easier to
read through. Headings, list labels, file names, commit hashes and names from
code each get their own colour; tables, quotes and code blocks get a frame;
list bullets become small flowers; and your own prompts sit between two rows
of leaves and flowers, so each exchange is easy to find when scrolling back.

It changes only how a reply is drawn on your screen. The message Claude wrote,
what is stored in the session and what the model reads all stay exactly as
they were, so it costs no tokens. The plugin gives the model no tool, reads
and writes no files and makes no network requests.

## How to install

The repository is private. Installing needs a GitHub account that has been
invited to it, and Git on your computer signed in to that account (for
example with `gh auth login`).

```
/plugin install reply-highlight --marketplace mahdava/reply-highlight
```

Answer `y` when it asks to add the marketplace. There is no need to clone
this repository: the command fetches Reply Highlight from GitHub into Claude
Code's own plugins folder. Cloning is only for working on the plugin itself,
as [docs/DEVELOP.md](docs/DEVELOP.md) describes.

You need Claude Code 2.1.302 or later. Installing from a shell, updating and
removing are in [docs/INSTALL.md](docs/INSTALL.md).

## How to update

From a shell:

```
claude plugin marketplace update reply-highlight
claude plugin update reply-highlight@reply-highlight
```

Then run `/reload-plugins` in any open session, or start a new one.

## How to use Reply Highlight

There is nothing to run. Once installed, every reply Claude draws in the
terminal is coloured, the replies already on screen included. To turn it
off, disable the plugin in `/plugin` or uninstall it.

| What | How it is drawn |
| --- | --- |
| Headings | Bold orange; smaller ones (`###` and below) a softer orange |
| List labels (`- **Label:** text`) | Bold green, lined up in one column |
| Bullets and numbers | A yellow ✿ for bullets, yellow numbers, an empty row between items |
| File names and paths | Teal, on a dark teal background |
| Commit hashes | Yellow, on a dark yellow background |
| Names from code | Pink, on a dark pink background |
| Tables | Faint yellow lines between every cell and row, a green header, striped rows |
| Quotes | A purple bar on the left |
| Code blocks | The language on a faint line above, a dark background behind |
| Your prompts | A yellow `❯`, between two full-width rows of ❦ leaves and ✿ flowers |
| The "Cooked for…" line | A yellow ✿ in front |

[docs/GUIDE.md](docs/GUIDE.md) says exactly what is coloured, what is left
to the terminal and why.

## Resources

- [Guide](docs/GUIDE.md): every part of a reply the mod draws, what it leaves to the terminal, and its limits
- [Install](docs/INSTALL.md): requirements, installing from a shell or the desktop app, updating and removing
- [Troubleshooting](docs/TROUBLESHOOTING.md): fixes for the problems seen so far
- [Develop](docs/DEVELOP.md): the files, the checks and working on a local copy

Found a problem, or have an idea? [Open an issue](https://github.com/mahdava/reply-highlight/issues).

## License

The code and documentation are under the [MIT License](LICENSE).
