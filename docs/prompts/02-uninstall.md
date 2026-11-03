# Prompt 02 · Uninstall

The agent removes the three mods and the marketplace, and asks before removing the sidebar permission rules. It
never deletes sidebar sections (you do that in the app) and never touches other plugins.

Use it when you no longer want the mods. For the same steps by hand, see the
[installation guide](../01-installation.md#uninstall).

## How to use

From any folder, in Claude Code or Codex:

```text
Read https://raw.githubusercontent.com/tfavareto/claude-desktop-mods/main/docs/prompts/02-uninstall.md and execute the entire block in the "Prompt" section on this computer.
```

## Prompt

```markdown
# Task: uninstall the Claude desktop mods

You are removing the Claude Code plugins chat-status, usage-band and environment-pane, installed from the
marketplace claude-desktop-mods.

## Authorization and limits

You are authorized to:
- run `claude plugin list`;
- run `claude plugin uninstall <mod>@claude-desktop-mods` for the three mods;
- run `claude plugin marketplace remove claude-desktop-mods`.

You are NOT authorized to, and must ask the user first if you think it is needed:
- change `~/.claude/settings.json` without showing the exact change and getting a "yes";
- remove any other plugin or marketplace, or quit the Claude app.

If a step fails, stop and show the last relevant lines.

## Steps

1. Run `claude plugin list` and note which of the three mods are installed from claude-desktop-mods.
2. Uninstall each of them: `claude plugin uninstall chat-status@claude-desktop-mods`, then usage-band, then
   environment-pane.
3. Remove the marketplace: `claude plugin marketplace remove claude-desktop-mods`.
4. Ask the user whether to remove `mcp__ccd_sidebar__list_sections`, `mcp__ccd_sidebar__create_section` and
   `mcp__ccd_sidebar__move_sessions` from `permissions.allow` in `~/.claude/settings.json`. If yes, show the diff,
   remove only those three strings, and keep the JSON valid.

## Verification checklist

- `claude plugin list` no longer shows the three mods.

## Final report

- Removed: the mods and the marketplace.
- Permission rules: removed, or kept by the user.
- Still to do by the user: delete the sidebar sections if unwanted, and restart the Claude app with Cmd+Q.
- Problems or questions.
```

## Next

- [Prompt 01 · Install](01-install.md) · [Troubleshooting](../05-troubleshooting.md)
