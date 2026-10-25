# Installing Reply Highlight

This page covers what Reply Highlight needs, and every way to install,
update and remove it: from a Claude Code session, from a shell, or from the
desktop app. Back to the [README](../README.md).

## Requirements

| What | Version |
| --- | --- |
| Claude Code | 2.1.302 or later, for the mods API. Tested on 2.1.302. |
| GitHub access | The repository is private: an account invited to it, with Git on your computer signed in to it |

The mod styles replies in the terminal. The desktop app, VS Code and the
mobile app keep their own drawing.

## Install

There is no need to clone the repository. Each way below fetches Reply
Highlight from GitHub into Claude Code's own plugins folder, and updates come
the same way. Clone it only to work on the plugin; see
[Developing Reply Highlight](DEVELOP.md).

Claude Code fetches the private repository with your own Git sign-in. If the
install says the marketplace cannot be found, sign in first, for example with:

```
gh auth login
```

At the prompt of a Claude Code terminal session:

```
/plugin install reply-highlight --marketplace mahdava/reply-highlight
```

Or from a shell:

```
claude plugin install reply-highlight --marketplace mahdava/reply-highlight
```

Answer `y` to add the marketplace, then pick the user scope. The plugin is
active at once in that session, and in every session started afterwards.

In the desktop app, where `/plugin` does not run, click + next to the prompt
box, then Plugins. Add the marketplace `mahdava/reply-highlight`, then add
the plugin.

To update later:

```
claude plugin marketplace update reply-highlight
claude plugin update reply-highlight@reply-highlight
```

To remove it:

```
claude plugin uninstall reply-highlight@reply-highlight
```
