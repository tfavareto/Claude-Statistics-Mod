# Troubleshooting

Symptom, cause, fix.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Nothing shows in a chat | The chat started before the install | Run `/reload-plugins` in it, or quit the app with Cmd+Q and reopen it |
| The chat never moves between sections | Auto mode refused the sidebar calls | Allow the three sidebar tools ([how](01-installation.md#allow-the-sidebar-calls-auto-mode)) |
| A chat with a yellow dot stays in `⏳ Waiting` | The app wrote its summary late, or not on macOS | It moves within two minutes on macOS; elsewhere only questions and prompts move it |
| The usage band is empty | The plan has no usage windows (an API key, Bedrock, Vertex) | Expected: the band shows plan limits only |
| The Environment pane is closed | It was closed in this chat | Run `/environment` |
| Remote Control does nothing | The app refused or is waiting for your approval | Approve the card the app shows, or toggle it from the app's toolbar |
| A mod runs twice | It is loaded both from a folder and from the marketplace | Keep one: `claude plugin disable <mod>@claude-desktop-mods` or drop the folder from `CLAUDE_CODE_PLUGIN_DIRS` |

Still stuck: open an [issue](https://github.com/tfavareto/claude-desktop-mods/issues/new/choose) with the redacted
`<mod>:` lines from `claude --debug`.

## Next

- [Installation](01-installation.md) · [Documentation index](README.md)
