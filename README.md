# Pete's parkrun userscripts

A collection of userscripts that enhance parkrun pages with extra statistics, visualisations, and challenges.

[![CI/CD](https://github.com/johnsyweb/tampermonkey-parkrun/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/johnsyweb/tampermonkey-parkrun/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

These scripts work on parkrun event pages, parkrunner profiles, and results pages. Use them with any userscript manager, or as bookmarklets, to dig into results without leaving the parkrun site.

## Getting started

1. Install a userscript manager such as [Tampermonkey][tampermonkey], [Userscripts][userscripts], or [Violentmonkey][violentmonkey].
2. Browse the scripts on the microsite: [johnsy.com/tampermonkey-parkrun][microsite].
3. Open a script’s page and install via **Userscript (recommended)**, or use the bookmarklet instructions there.

Each script page includes a screenshot, install options, and first-time setup help. Bookmarklets can be dragged to the bookmarks bar or pasted as a bookmark URL.

## Help

Report bugs or request features via [GitHub Issues](https://github.com/johnsyweb/tampermonkey-parkrun/issues). See [CONTRIBUTING.md](CONTRIBUTING.md) for what to include. Script pages on the microsite link to support when `@supportURL` is set.

## Maintainers

Maintained by [Pete Johns (@johnsyweb)](https://github.com/johnsyweb). Contributions are welcome.

## Development status

Maintained. Userscript versions are bumped automatically on `main` by CI (`scripts/update-version.js`). The package version is `1.0.0`.

## Local development

This project uses [mise][mise] for tools and [aube][aube] for packages (reads and updates `pnpm-lock.yaml`).

Prerequisites: [mise][mise].

```bash
mise run bootstrap   # install tools and dependencies
mise run setup       # bootstrap and build generated scripts
mise tasks           # list available tasks
```

Pinned tools in `mise.toml`: Ruby 3.4.7 (Jekyll), Node 22, aube 1.17.1.

Common commands:

| Task | Command |
|------|---------|
| Install dependencies | `aube install` |
| Run a script | `aube run build:scripts` |
| Run tests | `aube test` |
| One-off CLI tool | `aubx <pkg>` |

`mise` tasks: `bootstrap`, `setup`, `update`, `build`, `server`, `test`, `screenshots`, `preview`, `docs-check`, `cibuild`.

Source lives in `src/`. Default build uses Babel; opt-in esbuild bundling is configured in `scripts/userscript-build.config.js`. Extended microsite copy can live in `src/{slug}.description.md`.

Screenshots are committed under `docs/images/` (parkrun blocks automated capture from GitHub Actions). Regenerate with `mise run screenshots -- <script-name>` or `--force` for all. `docs:build`, `docs:serve`, and CI use committed images only.

Preview a userscript in a browser (builds, opens `@screenshot-url`, injects the script):

```bash
mise run preview -- parkrun-charts
```

Serve the microsite locally:

```bash
mise run server
```

Visit http://localhost:4000/tampermonkey-parkrun/

Root `*.user.js` files are built from `src/`. `.gitattributes` uses the `ours` merge strategy for those outputs; after a merge or rebase run `mise run update`. Set `git config merge.ours.driver true` if needed.

Husky hooks: pre-commit runs format check, tests, and lint; pre-push runs CI and regenerates screenshots whose PNG or WebP thumbnail predates `src/<script>.user.js`, blocking the push until those images are committed.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Use conventional commits, keep changes focused, and run `mise run cibuild` before opening a pull request.

## Releasing

Push to `main` runs GitHub Actions CI/CD: tests and lint, builds userscripts, updates `@version` fields via `scripts/update-version.js`, builds the Jekyll microsite from committed assets, and deploys to GitHub Pages. Do not run `update-version` locally (it requires `CI`/`GITHUB_ACTIONS`).

## License

[MIT](LICENSE.md)

<!-- Links -->

[aube]: https://aube.en.dev/
[microsite]: https://www.johnsy.com/tampermonkey-parkrun/
[mise]: https://mise.jdx.dev/
[tampermonkey]: https://www.tampermonkey.net/
[userscripts]: https://apps.apple.com/app/userscripts/id1463298887
[violentmonkey]: https://violentmonkey.github.io/
