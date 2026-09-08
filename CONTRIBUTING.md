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
functions/              Pages Functions
```

`pnpm docs:dev` gives a working in-page editor that reads and writes local
files. Deployed, it signs in through a GitHub OAuth App and opens a pull
request from the member's own fork. The only deployment setting is
`GITHUB_CLIENT_SECRET` on the Pages project; the client id is public and lives
in the source.

## Where content goes

- `about/`, `tutorial/`, `process/` and `archived/` build their sidebars by scanning the directory. Add a markdown file and it appears; nothing else to edit.
- `repair/` and `concepts/` carry no sidebar. Link a new page from its section index; search covers the rest.
- `archived/` holds two kinds of page, told apart by `archive.source`. A page transcribed from an original follows that original word for word, typos included — correct the transcription, never the source. A page whose source is `协会自有记录` is this association's own record, filed by year, and reads like any other page.

Scanned entries take their label from the page's H1 and sort by `order` in frontmatter, then by title. A page without `order` sorts to the end of its group.

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
