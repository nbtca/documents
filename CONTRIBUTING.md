# Contributing

## Local setup

You need Node.js 22 and pnpm 9.

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
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

`pnpm docs:dev` gives an in-page editor. It reads and writes local files, including images.

The deployed editor works differently:

- It signs in through a GitHub OAuth App.
- It opens a pull request from the member's own fork.
- It uploads inserted images when the member submits the edit. The page keeps a `/media/…` reference, not a file in the repository.
- It does not upload images from a draft that the member does not submit.

The Pages project needs these deployment settings:

- `GITHUB_CLIENT_SECRET`: the secret of the GitHub OAuth App. The client ID is public and is in the source. The server accepts an upload only when this secret can verify the editor's token.
- R2 binding `MEDIA`: the bucket for the uploads. `GET /media/…` reads the object. Do not name the binding `ASSETS`. Pages uses `ASSETS` for the site files, and a second binding with the same name makes the deploy fail. If `MEDIA` is missing, uploads return 503 and the rest of the site continues to work. Existing images stay in the repository.

The build also publishes the markdown source of each page at `/docs-api/raw/<path>`. `/docs-api/index.json` lists each source with its git blob SHA. The [Prompt](https://github.com/nbtca/Prompt) terminal client reads the sources there, because much of mainland China cannot reach GitHub. The index has the same shape as GitHub's recursive tree response.

> [!CAUTION]
> Do not change these two URLs or the shape of the index. Prompt reads them, and a change breaks Prompt.

## Where content goes

- `about/`, `tutorial/`, `process/` and `archived/` build their sidebars from the files in the directory. When you add a markdown file, it appears in the sidebar. You do not edit anything else.
- `repair/` and `concepts/` have no sidebar. Link each new page from its section index. Search finds the other pages.
- `archived/` has two types of page. The `archive.source` field shows the type:
  - A page transcribed from an original document follows that original word for word, including its typos. Correct errors in the transcription. Do not correct the original.
  - A page with the source `协会自有记录` is the association's own record. It is filed by year and is written like any other page.

Each sidebar entry gets its label from the H1 of the page. Entries sort by `order` in the frontmatter, then by title. A page without `order` goes to the end of its group.

Internal links start with `/`. When you rename a page, update every link to it. Do not change published URLs.

## Maintainers

Each page outside `archived/` names a maintainer in its frontmatter. The tests reject a page that has no maintainer or has an incorrect date.

```yaml
---
maintainers:
  - user: m1ngsama # GitHub login, no @
    since: 2026-07 # YYYY-MM, omit when undated
---
```

Archived pages use `archive:` instead. Its `transcriber` field names the person who typed the original.

## Before you push

Run these four checks. All four must pass:

```bash
pnpm run ci:lint
pnpm test -- --run
pnpm docs:build
pnpm run ci:verify
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/). Write code, comments and repository files in English. Write the documents in Chinese.

The pages follow the writing rules of [ASD-STE100](https://www.asd-ste100.org/). Use only three admonition types:

| Syntax             | Use                                                  |
| ------------------ | ---------------------------------------------------- |
| `::: danger 警告`  | The procedure can cause injury.                      |
| `::: warning 注意` | The procedure can cause damage to equipment or data. |
| `::: info 注`      | Information only. No commands.                       |

## Pull requests

Each pull request has one subject. Keep content, navigation, CI and assets in separate pull requests. The template asks what you changed and which checks you ran.
