---
status: accepted
---

# aube with paranoid mode for package management

This repo already used aube against a `pnpm-lock.yaml` hybrid. Dependabot and frozen CI could not share one truthful lock, and lifecycle-script policy lived under `package.json`’s `pnpm` key. We cut over to native `aube-lock.yaml` with the same paranoid posture as ambassy and progression.

## Decision

1. **aube as the sole npm package manager** — import the former pnpm lock into `aube-lock.yaml`; retire `pnpm-lock.yaml`. Atomic cutover across local dev, CI, Husky hooks, and docs. Ruby/Bundler for the Jekyll microsite stays separate under `docs/`.
2. **`paranoid: true`** in `aube-workspace.yaml` — jailed builds, strict store integrity, strict dependency-build review, OSV malicious-package checks, and a seven-day minimum release age (aligned with Renovate; see ADR 0002).
3. **Explicit build approval** — lifecycle scripts run only when listed in `allowBuilds` (`esbuild`, `puppeteer`, `sharp`, `unrs-resolver`), moved out of `package.json`’s `pnpm` block.
4. **Release-age gate escape hatch** — add packages to `minimumReleaseAgeExclude` in a deliberate PR only when an emergency security bump cannot wait.
5. **CVE audit in CI** — `aube audit --audit-level moderate --ignore-unfixable` via `./script/audit` and `./script/cibuild`.
6. **Version pinning** — `aube` in `mise.toml`, `packageManager: "aube@1.41.0"` in `package.json`, and `packageManagerStrictVersion: true`.
7. **CI bootstrap via mise** — `jdx/mise-action` installs Node, Ruby, and aube; cache the aube store keyed on `aube-lock.yaml`; frozen installs via `aube ci`.
8. **Local tasks** — `mise run bootstrap` / `update` / `update-deps` / `cibuild` for the usual contributor flows.
9. **Security overrides** — `minimatch`, `brace-expansion`, `source-map-js`, and `undici` (8.x for jsdom 30) in `aube-workspace.yaml`, with matching `minimumReleaseAgeExclude` until they age past the seven-day gate. Direct `sharp` stays on a patched range in `package.json`.
10. **Trust-policy escape hatch** — `trustPolicyExclude` lists a narrow `chromium-bidi@…` pin when puppeteer resolution selects a release without trusted-publisher evidence (fail closed otherwise).

## Considered options

**Keep pnpm lock with aube hybrid (rejected)** — fleet standard is native aube-lock; Dependabot still does not refresh it.

**Phased cutover (rejected)** — mixed lockfiles defeat paranoid guarantees until cutover completes.

**aube without paranoid mode (rejected)** — faster installs but weaker protection against freshly published malicious packages and unreviewed lifecycle scripts.

## Consequences

- Contributors need [mise](https://mise.jdx.dev/) and run `aube install` / `aube ci`.
- New dependencies with lifecycle scripts need an explicit `allowBuilds` entry before CI passes.
- Emergency bumps younger than seven days need a visible `minimumReleaseAgeExclude` commit.
