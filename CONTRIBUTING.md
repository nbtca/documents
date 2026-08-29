# Contributing

## Local setup

Node.js 22, pnpm 9.

```bash
pnpm install
pnpm docs:dev
```

## Layout

```text
about/ concepts/ repair/ process/ tutorial/ archived/   content + assets/
public/                                                 fixed URLs

.vitepress/config.mts   site config
.vitepress/sidebars/    sidebars
.vitepress/theme/       components, styles
utils/                  build-time modules
checks/                 contracts, asset manifest, dist verifier
```

## Where content goes

- `tutorial/` and `process/` share one sidebar. Adding a page means updating `.vitepress/sidebars/guide.ts`.
- `about/` has its own: `.vitepress/sidebars/about.ts`.
- `repair/` and `concepts/` carry no sidebar. Link a new page from its section index; search covers the rest.
- `archived/` is scanned automatically. Leave the record as it stands.

Internal links start with `/`. Renaming a page means updating every reference to it, and published URLs stay put.

## Maintainers

Every page outside `archived/` names one in frontmatter. The tests reject a page that omits it or dates it wrong.

```yaml
---
maintainers:
  - user: m1ngsama # GitHub login, no @
    since: 2026-07 # YYYY-MM, omit when undated
---
```

Archived pages carry `archive:` instead, where `transcriber` names who typed the original up.

## Before pushing

```bash
pnpm run ci:lint
pnpm test -- --run
pnpm docs:build
pnpm run ci:verify
```

Commits follow Conventional Commits. Code, comments and repository files are in English; Chinese is for the documents themselves.

## Pull requests

One concern per PR — content, navigation, CI and assets apart. The template asks what changed and what you ran.
