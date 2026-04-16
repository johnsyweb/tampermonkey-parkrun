# Pete's parkrun userscripts

## A script or scripts for messing with parkrun results pages

You'll need a userscript manager like [Tampermonkey][tampermonkey], [Userscripts][userscripts], or [Violentmonkey][violentmonkey] if
you'd like to enjoy them. Or you can use the bookmarklet versions.

A browsable list of scripts and bookmarklets lives on the microsite at: [johnsy.com/tampermonkey-parkrun][microsite].

## Development Setup

This project uses [mise][mise] for development environment management.

### Prerequisites

- [mise][mise] - for managing development tools

### Setup

1. Bootstrap the project:
   ```bash
   mise run bootstrap
   ```

2. Confirm task availability:
   ```bash
   mise tasks
   ```

The `.tool-versions` file specifies the required versions:
- Ruby 3.4.7 (for Jekyll)
- Node 22 (for development tools)
- pnpm 10.8.0 (for package management)

### Standard task commands (scripts-to-rule-them-all style)

This repo includes `mise` tasks with consistent names for common workflows:

- `mise run bootstrap` - install tools and all dependencies
- `mise run setup` - bootstrap and build generated scripts
- `mise run update` - refresh dependencies and generated data
- `mise run build` - build scripts and the microsite
- `mise run server` - serve the microsite locally
- `mise run test` - run lint and tests
- `mise run screenshots` - generate microsite screenshots
- `mise run preview` - preview a userscript in a browser
- `mise run docs-check` - run local microsite checks
- `mise run cibuild` - run the full CI-equivalent pipeline

List all available tasks:

```bash
mise tasks
```

### Previewing the Microsite Locally

The microsite documentation is built with Jekyll and served from the `docs/` directory.

1. Start the local server:
   ```bash
   mise run server
   ```

2. Visit http://localhost:4000/tampermonkey-parkrun/ in your browser

### Generating Screenshots

To generate screenshots for the microsite:

```bash
mise run screenshots
```

This will create screenshots of all userscripts in `docs/images/`. Scripts are included if their UserScript header contains `@screenshot-url`; you can optionally add `@screenshot-selector`, `@screenshot-timeout`, and `@screenshot-viewport` (e.g. `1200x800`) in the script header to control how the screenshot is taken.

### Verifying a userscript in the browser

To build the userscripts, open the script’s `@screenshot-url` in a new browser window with the built script injected (so you can verify changes without installing Tampermonkey):

```bash
mise run preview
```

This builds from `src/`, then launches a browser, navigates to the default script’s screenshot URL (e.g. parkrun Cancellation Impact → Aurora event history), injects the built script, and leaves the window open. To preview a different script, pass its name: `mise run preview -- parkrun-charts`.

### Building the Microsite

The microsite is automatically deployed to GitHub Pages on every push to `main`. 

To build the site locally:

```bash
mise run build
```

The site will be available at http://localhost:4000/tampermonkey-parkrun/

### Avoiding Merge Conflicts in Built Files

The root directory contains built `.user.js` files that are generated from `src/` by `mise run update` (which runs the script build). To prevent merge conflicts during rebases or pulls:

1. **`.gitattributes`** marks these files with the `ours` merge strategy, which automatically keeps your local version during conflicts
2. After any merge/rebase, run `mise run update` to regenerate built files and data from `src/`
3. The git config `merge.ours.driver` should be set to `true`:
   ```bash
   git config merge.ours.driver true
   ```

This approach ensures that:
- Source files in `src/` are the single source of truth
- Merge conflicts only occur in source files where they matter
- Built files are automatically regenerated after conflict resolution

### Git Hooks

This project uses [husky][husky] to manage git hooks. Hooks are automatically installed during `mise run bootstrap`.

#### Pre-commit Hook

The pre-commit hook ensures code quality by running:
- `pnpm check-format` - Checks code formatting with Prettier
- `pnpm test` - Runs all Jest tests
- `pnpm lint` - Runs ESLint to check for linting errors

All checks must pass before a commit is allowed. This ensures all code is properly formatted, tested, and linted before being committed.

#### Pre-push Hook

The pre-push hook automatically generates screenshots when userscripts are modified:

- Checks if any `.user.js` files have been modified in the commits being pushed
- Automatically runs `pnpm screenshots` if userscripts were changed
- Prevents the push if screenshot generation fails

> [!NOTE]
> Screenshots must be generated locally because parkrun websites block automated agents from accessing them in CI environments.

### GitHub Actions Workflow

The project includes a GitHub Actions workflow that:

1. Sets up Ruby (for Jekyll) and Node.js (for scripts)
2. Installs dependencies (via mise, pnpm, and bundler)
3. Generates the scripts data file from userscript metadata in the built scripts
4. Builds the Jekyll site
5. Deploys to GitHub Pages

This workflow runs on every push to `main` and automatically keeps the microsite up to date with the latest scripts.

## Why?

Why not?

## How to Install Bookmarklets

Each script now has its own page on the microsite with a “bookmarklet” button and a copy‑and‑paste JavaScript snippet.

To install a bookmarklet:

1. Visit the script’s page on the microsite.
2. Either drag the “bookmarklet” button to your bookmarks bar, **or** copy the JavaScript code shown under “Mobile bookmarklet”.
3. In your browser’s bookmarks manager, create a new bookmark and paste the JavaScript into the URL field.
4. Save the bookmark.

You can then click the bookmark while viewing the appropriate parkrun page to run the script.

## Updating Versions

Userscript `@version` fields are updated automatically in CI by a GitHub Actions job that runs `scripts/update-version.js`.

> [!NOTE]
> `scripts/update-version.js` is intended to run only in CI (it checks `CI`/`GITHUB_ACTIONS` and exits with an error otherwise), so you normally do **not** run it locally.

## Contributing

Contributions are welcome! Here's how to get started:

### Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the [Development Setup](#development-setup) instructions above
4. Create a new branch for your changes: `git checkout -b feature/your-feature-name`

### Making Changes

- **Code Quality**: All code must pass formatting (Prettier), linting (ESLint), and tests (Jest). These checks run automatically via git hooks before commit and push.
- **Screenshots**: If you modify a userscript, screenshots will be automatically regenerated on push. Make sure to commit the updated screenshots in `docs/images/`.
- **Testing**: Add tests for new functionality in the `__tests__/` directory. Run `mise run test` to verify your tests pass.
- **Documentation**: Update the microsite documentation if your changes affect user-facing features. The microsite is built from the `docs/` directory.

### Submitting Changes

1. Ensure all checks pass locally (`mise run cibuild` runs the full CI-equivalent suite)
2. Commit your changes with clear, descriptive commit messages
3. Push to your fork: `git push origin feature/your-feature-name`
4. Open a Pull Request on GitHub

### Pull Request Guidelines

- Provide a clear description of what your PR does
- Reference any related issues
- Ensure CI checks pass (they run automatically)
- Keep PRs focused on a single feature or fix

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

<!-- Links -->

[husky]: https://typicode.github.io/husky/
[microsite]: https://www.johnsy.com/tampermonkey-parkrun/
[mise]: https://mise.jdx.dev/
[tampermonkey]: https://www.tampermonkey.net/
[userscripts]: https://apps.apple.com/app/userscripts/id1463298887
[violentmonkey]: https://violentmonkey.github.io/
