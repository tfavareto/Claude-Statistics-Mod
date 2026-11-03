# Evidence and limits

How the mods are checked, and what they do not do.

## Checks

| Check | How | Result |
| --- | --- | --- |
| Behaviour tests | `claude plugin test plugins/<mod>`: the engine's own test kit, with the app's tools stubbed | chat-status 18, usage-band 6, environment-pane 10 passing |
| Manifest and module | `claude plugin validate` on the marketplace and each mod | passes (warnings only: no per-mod README, license or icon) |
| Types | `tsc -p plugins/<mod>` with the engine's type file, `strict` | no errors |
| Docs | `npm run docs:check` (links, anchors, JSON, README alignment) and `xmllint` on the SVGs, in CI | passes |
| In the app | Used daily in the Claude desktop app on macOS, Claude Code 2.1.309 | sections, band, pane and buttons seen working |

## Known limits

- macOS only for the yellow-dot reading of chat-status: it reads the app's session files from their macOS folder.
  The other moves work wherever the desktop app's sidebar tools exist.
- In auto mode the classifier can refuse the sidebar calls until you allow them
  ([how](01-installation.md#allow-the-sidebar-calls-auto-mode)).
- A chat started before the mods were installed shows nothing until it restarts or runs `/reload-plugins`.
- The pace estimate is a straight line, so it can differ from the app's own estimate.
- The column chart uses a linear scale: small categories are thin next to the messages column; hover for numbers.
- The Environment pane cannot replace the app's own side panel; close that one with its toolbar button.
- Files Claude touched before the pane loaded are not marked.

## Next

- [Troubleshooting](05-troubleshooting.md)
