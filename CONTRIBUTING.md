# Contributing

Thanks for helping. Small, tested pull requests are the easiest to review.

## Requirements

- macOS with the Claude desktop app (Code tab) and the `claude` CLI on your `PATH`.
- Node.js 20 or later, for `npm run docs:check`.

## Develop a mod

1. Fork and clone the repository.
2. Load the mods from your clone instead of the installed copies: add to the `env` block of
   `~/.claude/settings.json`, then restart the desktop app once:

   ```json
   "CLAUDE_CODE_PLUGIN_DIRS": "/absolute/path/to/your/clone/plugins",
   "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
   ```

   With the watch on, each saved file reloads the mod in open chats; disable the marketplace copies meanwhile
   (`claude plugin disable <mod>@claude-desktop-mods`) so a mod does not run twice.
3. Change the code and its tests together.

## Before a pull request

```bash
npm run test
npm run validate
npm run docs:check
```

## Pull requests

- One topic per pull request, with a clear title in conventional-commit form.
- Describe what changed and why; list the checks you ran.
- Images: made-up data only. Update `README.md` and `README.pt-BR.md` together when a section changes.

## Issues

Use the issue forms. Redact paths, account ids and private content from logs and screenshots.

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
