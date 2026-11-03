# Prompt 01 · Install

The agent checks that the `claude` CLI is there, adds this repository's marketplace, installs the three mods, asks
before adding the three sidebar permission rules to `~/.claude/settings.json`, and asks whether to rename the
sidebar sections. It never uses `sudo`, never touches other plugins, and never restarts the app for you.

Use it for a first install. For the same steps by hand, see the [installation guide](../01-installation.md).

## How to use

From any folder, without a clone, in Claude Code or Codex:

```text
Read https://raw.githubusercontent.com/tfavareto/claude-desktop-mods/main/docs/prompts/01-install.md and execute the entire block in the "Prompt" section on this computer.
```

From a clone of this repository:

```text
Read docs/prompts/01-install.md in this repository and execute the entire block in the "Prompt" section.
```

## Prompt

```markdown
# Task: install the Claude desktop mods

You are installing three Claude Code plugins ("mods") from the GitHub marketplace tfavareto/claude-desktop-mods
for the Claude desktop app's Code tab on macOS: chat-status, usage-band and environment-pane.

## Authorization and limits

You are authorized to:
- run `claude --version`, `claude plugin list`, `claude plugin marketplace add tfavareto/claude-desktop-mods`;
- run `claude plugin install <mod>@claude-desktop-mods` for chat-status, usage-band and environment-pane;
- run `claude plugin configure chat-status@claude-desktop-mods --values-stdin` and the same for usage-band, with values the user chose.

You are NOT authorized to, and must ask the user first if you think it is needed:
- use `sudo` or install anything else;
- change `~/.claude/settings.json` without showing the exact change and getting a "yes";
- disable, remove or change any other plugin or marketplace;
- quit or restart the Claude app.

If a step fails, stop, show the last relevant lines and propose a fix. No destructive workarounds.

## Steps

1. Check the platform and the CLI: `uname -s` prints `Darwin`, and `claude --version` prints a version. If the CLI
   is missing, stop and tell the user to install Claude Code first.
2. Add the marketplace: `claude plugin marketplace add tfavareto/claude-desktop-mods`. If it is already added, run
   `claude plugin marketplace update claude-desktop-mods` instead.
3. Install the mods, one command each:
   `claude plugin install chat-status@claude-desktop-mods`,
   `claude plugin install usage-band@claude-desktop-mods`,
   `claude plugin install environment-pane@claude-desktop-mods`.
4. Ask the user whether to allow the sidebar calls chat-status makes in auto mode. If yes, add these three strings to
   the `permissions.allow` array of `~/.claude/settings.json`, keeping everything else in the file as it is and the
   JSON valid: `mcp__ccd_sidebar__list_sections`, `mcp__ccd_sidebar__create_section`,
   `mcp__ccd_sidebar__move_sessions`. Show the diff first.
5. Ask the user which language they want. For Portuguese, run
   `printf '%s' '{"language":"pt-BR"}' | claude plugin configure usage-band@claude-desktop-mods --values-stdin` and
   `printf '%s' '{"workingSection":"🟢 Em andamento","waitingSection":"⏳ Aguardando...","responseSection":"🟡 Aguardando resposta"}' | claude plugin configure chat-status@claude-desktop-mods --values-stdin`.
   For English, change nothing. If the user wants other section names, use theirs.

## Verification checklist

- `claude plugin list` shows chat-status, usage-band and environment-pane from claude-desktop-mods, enabled.
- If step 4 ran: `~/.claude/settings.json` is valid JSON and holds the three rules.

## Final report

Reply with exactly this structure and nothing secret in it:

- Installed: the three mods and their versions.
- Permission rules: added, or skipped by the user.
- Language: English or Portuguese (and any custom section names).
- Still to do by the user: quit the Claude app with Cmd+Q and open it again (or run /reload-plugins in each open chat).
- Problems or questions.
```

## Next

- [Prompt 02 · Uninstall](02-uninstall.md) · [The mods](../02-mods.md)
