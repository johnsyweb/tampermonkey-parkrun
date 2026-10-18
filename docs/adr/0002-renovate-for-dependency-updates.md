---
status: accepted
---

# Renovate for dependency updates (replacing Dependabot)

Dependabot’s npm ecosystem does not refresh `aube-lock.yaml`. After migrating to native aube (ADR 0001), Dependabot PRs would leave frozen `aube ci` installs stale or failing. We want the same fleet pattern as ambassy: hosted Renovate, seven-day cooling, automerge when CI is green (including majors), and lock regeneration without a custom GitHub App.

## Decision

1. **Mend Renovate (hosted)** owns npm, GitHub Actions, and Bundler updates via [johnsyweb/renovate-config](https://github.com/johnsyweb/renovate-config) (extends jdx’s preset).
2. **aube-lock workflow** on `renovate/**` regenerates `aube-lock.yaml`, runs `./script/cibuild`, and publishes Check Runs on the final HEAD so automerge does not need a GitHub App.
3. **Renovate membership** is declared in [johnsyweb/github-infra](https://github.com/johnsyweb/github-infra).
4. **Atomic cutover** — remove `.github/dependabot.yml` and `dependabot-auto-merge.yml` in the same change as Renovate lands.
5. **Cooling** — Renovate `minimumReleaseAge: 7 days`; aube `minimumReleaseAge: 10080` (minutes).
6. **Automerge** — Renovate platform automerge for all update types after green checks; majors stay in separate PRs.
7. **Commits** — Conventional Commits `chore(deps): …`.
8. **Local** — `mise run update-deps` runs `aube outdated` then `aube update` (within ranges). `mise run update` remains “refresh after git pull”.
9. **allowBuilds** — fail closed; human review when a new lifecycle script appears.

## Considered options

**Keep Dependabot + companion lock regen (rejected)** — less aligned with jdx’s path; Dependabot still does not understand aube.

**Self-hosted Renovate for postUpgradeTasks (rejected)** — more moving parts; hosted Renovate + aube-lock Check Runs matches ambassy.

**Automerge minors only (rejected)** — if CI is green, deliver.

## Consequences

- Add this repository to github-infra `renovate/repos.yaml` so the Mend app can access it.
- Open Dependabot PRs should be closed after cutover; Renovate becomes the sole updater.
