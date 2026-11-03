# Privacy and security

The mods read only what they draw, write nothing, and send nothing over the network.

## What each mod reads and calls

| Mod | Reads | Calls |
| --- | --- | --- |
| chat-status | The chat's own session file in `~/Library/Application Support/Claude/claude-code-sessions/` (only its turn summary), the running agents list. | `get_session`, `list_sections`, `create_section`, `move_sessions` on the app's own servers. |
| usage-band | The plan's usage windows. | `get_usage` on the app's own server; the engine's `session.usage`. |
| environment-pane | The chat's folder listing (names only, no file contents), the context breakdown, the connectors' status. | `get_session`, `session_connectors_status`; `set_remote_control` and `show_pane` only when you press their buttons. |

None of the mods uses the network, runs commands, or writes files. All state lives in the session (`$.state`)
and is gone when the chat closes.

## Protections

- Remote Control changes only on your press, and the app asks you to approve it.
- Folder names come from the chat's own working folder; files are opened by the app, not read by the mod.
- The repository holds no keys; every file was scanned for key and token formats before the first push.

## Report a problem

See [SECURITY.md](../SECURITY.md).

## Next

- [Evidence and limits](04-validation.md)
