# Installation

Install the three mods from this repository's marketplace, allow the sidebar calls, and restart the app once.

## Requirements

- macOS with the Claude desktop app, using its **Code** tab.
- The `claude` CLI on your `PATH` (the one the desktop app installs works). The mods were built and tested on
  Claude Code 2.1.309.

## Install

One line in a terminal adds the marketplace and installs all three mods:

```bash
claude plugin marketplace add tfavareto/claude-desktop-mods && for m in chat-status usage-band environment-pane; do claude plugin install "$m@claude-desktop-mods"; done
```

One mod only, from a terminal session of Claude Code:

```text
/plugin install usage-band --marketplace tfavareto/claude-desktop-mods
```

Answer `y` to add the marketplace, then pick the user scope.

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add
marketplace** with `tfavareto/claude-desktop-mods`, then **Add plugin** for each mod.

## Allow the sidebar calls (auto mode)

`chat-status` moves the chat with the app's sidebar tools. In auto mode the safety classifier may refuse a tool
call that a mod makes on its own; allow these three in the `permissions.allow` list of `~/.claude/settings.json`:

```json
"mcp__ccd_sidebar__list_sections",
"mcp__ccd_sidebar__create_section",
"mcp__ccd_sidebar__move_sessions"
```

## Load them

Quit the desktop app with **Cmd+Q** and open it again: each chat loads the mods when it starts. In a chat that is
already open, `/reload-plugins` loads them too.

## Name the sections in your language (optional)

`chat-status` creates the sections it needs on first use: `🟢 Working`, `⏳ Waiting` and `🟡 Needs your answer`.
To use other names (an existing section with the same name is reused):

```bash
printf '%s' '{"workingSection":"🟢 Em andamento","waitingSection":"⏳ Aguardando...","responseSection":"🟡 Aguardando resposta"}' | claude plugin configure chat-status@claude-desktop-mods --values-stdin
```

A **⏸️ Paused** section is one you create yourself in the sidebar and drag chats into.

## Update

```bash
claude plugin marketplace update claude-desktop-mods && for m in chat-status usage-band environment-pane; do claude plugin update "$m@claude-desktop-mods"; done
```

## Uninstall

```bash
for m in chat-status usage-band environment-pane; do claude plugin uninstall "$m@claude-desktop-mods"; done; claude plugin marketplace remove claude-desktop-mods
```

The sidebar sections stay; delete them in the sidebar if you no longer want them.

## Next

- [The mods](02-mods.md) · [Troubleshooting](05-troubleshooting.md) · [Install prompt](prompts/01-install.md)
