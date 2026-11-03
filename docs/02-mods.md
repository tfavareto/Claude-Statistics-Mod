# The mods

What each mod shows, when it changes, and the options it takes.

## chat-status

Files the current chat in the sidebar by what Claude is doing.

| Section | When the chat moves there |
| --- | --- |
| `🟢 Working` | A turn of the main conversation starts; and back from `🟡` once you answer a question or a permission prompt. |
| `🟡 Needs your answer` | Claude calls `AskUserQuestion` or `ExitPlanMode`, a permission prompt opens, the turn ends with a blocking question, or the app's own summary of the turn says it is blocked on you (the yellow dot). |
| `⏳ Waiting` | The turn ends with nothing pending and no background agent still running. |
| `⏸️ Paused` | Only when you drag the chat there. A new message moves it back to `🟢 Working`. |

How it decides: hooks on `turn.start`, `turn.complete`, `tool.call` and `classic.PermissionRequest`; after a turn it
reads the app's summary of the chat for up to two minutes, because the app writes it a few seconds late. Subagent
turns never move the chat.

Options (`claude plugin configure chat-status@claude-desktop-mods`):

| Option | Default |
| --- | --- |
| `workingSection` | `🟢 Working` |
| `waitingSection` | `⏳ Waiting` |
| `responseSection` | `🟡 Needs your answer` |

A section with that exact name is reused; a missing one is created on first use.

## usage-band

A band above the prompt box, in one row:

| Part | What it shows |
| --- | --- |
| **Session** bar | Percent of the 5-hour session limit used, as a white loading bar, and the time to its reset. |
| **Week** bar | Percent of the weekly limit (all models), and the time to its reset. |
| Pace line (italic) | At the current pace, when a limit runs out if before its reset, or that the limits last until the reset. |

Options: `language`, `en` (default) or `pt-BR`
(`printf '%s' '{"language":"pt-BR"}' | claude plugin configure usage-band@claude-desktop-mods --values-stdin`). The figures come from
the desktop app's usage card (`get_usage`), refreshed every five minutes and after each turn; outside the desktop
app the engine's own rate-limit reading stands in. The pace is a straight line: what was used since the window
opened, carried forward at the same rate. It updates every minute, so a pause pushes the estimate later.

## environment-pane

A pane beside the chat, titled **Environment**, that opens with each chat (reopen it with `/environment`):

| Section | What it shows |
| --- | --- |
| Remote Control | Its state and a **Turn on** / **Turn off** button. |
| Folders | A pixel Claude whose pose follows what it does (writing code, running commands, reviewing, thinking, idle), and the chat's project tree: click a folder to open or close it, click a file to open it in the app. The tree opens itself to the file Claude works on, a small Claude sits beside that folder, and files it edited (`●`) or read (`○`) in this chat stay marked. |
| Context | Percent used, tokens used over the window, a bar split by category, and a column chart; hover a column for its exact tokens and shares. |
| Connectors | Each connected connector or MCP server with its tool count and a small logo; the ones this chat used are highlighted; a line counts those that need sign-in or failed. |

The tree hides `.git`, `node_modules` and common caches, and lists up to 40 entries per folder.

## Next

- [Privacy and security](03-privacy-and-security.md) · [Evidence and limits](04-validation.md)
