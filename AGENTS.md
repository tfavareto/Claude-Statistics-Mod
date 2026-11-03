# Agent guide

This repository holds three mods for the Claude desktop app's Code tab. A mod is a Claude Code plugin whose
`hooks/hooks.json` names a TypeScript hooks module (`register(on, options)`) that the engine runs inside its own
environment, with no DOM or Node: everything outside the module goes through `$`. The repository root is also a
plugin marketplace (`.claude-plugin/marketplace.json`), so each mod installs with `claude plugin install`.

## Map

| Path | What it is |
| --- | --- |
| `plugins/chat-status/` | Moves the chat between sidebar sections by what Claude is doing. |
| `plugins/usage-band/` | The band above the prompt: session and weekly usage, resets, pace. |
| `plugins/environment-pane/` | The Environment pane: Remote Control, project tree, context chart, connectors. |
| `.claude-plugin/marketplace.json` | The marketplace that lists the three mods. |
| `docs/` | Guides, copy-paste prompts and README images. |
| `scripts/validate-docs.mjs` | Checks Markdown links, anchors, JSON and README alignment. |

Each mod has `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.ts(x)`, the modules it imports,
its tests (`hooks/*.test.ts(x)`) and, when it keeps `$.state`, `types/index.d.ts`.

## Commands

```bash
npm run test          # claude plugin test for each mod (needs the claude CLI)
npm run validate      # claude plugin validate for the marketplace and each mod
npm run docs:check    # links, anchors, JSON and README alignment
```

Type-check a mod after the engine has loaded it once: `npx -p typescript tsc -p plugins/<mod>`.

## Rules

- Tests come with every logic change; keep them in Arrange / Act / Assert form.
- Functions that receive `$` are top-level function declarations: the engine follows `$` past an import only into
  a function declaration.
- No personal data anywhere: no home paths, account or org ids, session ids, real project or chat names.
  Tests and images use made-up names.
- Code, comments, docs and prompts are in English. Only the READMEs are translated (`README.pt-BR.md`), and they
  stay aligned with `README.md`: same sections, anchors, tables and images.
- When a behaviour, option or command changes, update the README(s), `docs/02-mods.md`, the prompts and this file.
- Conventional commits (`feat:`, `fix:`, `docs:`, …). Publish or push only when asked.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
