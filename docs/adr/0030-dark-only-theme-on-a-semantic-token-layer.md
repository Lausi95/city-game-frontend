# Dark-only theme on a semantic token layer

The app shipped on Next.js boilerplate styling: a near-empty `globals.css`
(`--background`/`--foreground` only) and **both** a light and a dark scheme
hardcoded inline in every component — raw Tailwind hues (`bg-zinc-800`,
`text-blue-600`, …) doubled up behind `dark:` prefixes and switched by
`prefers-color-scheme`. The same palette was redefined across ~32 of 52
component/page files, with no central place to change the look. Reworking the
look and feel from that base meant either editing every file by hand again, or
first introducing a layer that owns the palette. We chose the layer, and made
two structural decisions that gate the whole rework.

**Dark-only — light mode is dropped.** The product is explicitly a dim,
atmospheric dark theme (see [ADR 0031](./0031-scotland-yard-visual-identity.md)),
so we remove the `prefers-color-scheme` switch and every `dark:` variant and
render one theme always. This deletes roughly half the styling in the codebase
and removes the "defined twice, drifts apart" failure mode. The cost — light-mode
users lose their preference — is accepted as a deliberate product call, not an
oversight; re-adding light later would mean reintroducing a second value per
token (the tokens make that a one-file change, not a per-component one).

**Semantic design tokens, not raw hues.** The palette lives as named **role**
tokens in `globals.css` `@theme` — `--color-bg`, `--color-surface`,
`--color-surface-raised`, `--color-surface-overlay`, `--color-border`,
`--color-text`, `--color-text-muted`, `--color-text-faint`, `--color-accent`,
`--color-success`, `--color-warning`, `--color-danger`, plus the
category/map tokens in [ADR 0031](./0031-scotland-yard-visual-identity.md).
Components reference the role (`bg-surface`, `text-muted`), never a hue, so the
entire identity is tuned in one file. This mirrors how `tenant.ts` / `logger.ts`
centralise other cross-cutting concerns. The upfront cost is a one-time refactor
of every styled file; the payoff is that future palette changes stop being a
codebase-wide find-and-replace.

**Rich chrome, calm data.** The atmosphere is concentrated on *chrome* — page
background, header/wordmark, the signin screen, modal backdrops, the map frame,
and empty states carry the immersive treatment (fog vignette, texture, dossier
framing). *Data-dense* surfaces — agent/team lists, forms, stat grids, the
leaderboard — sit on calmer, near-flat panels that float above the texture so the
mood never competes with legibility in an operator tool. This split is a
first-class principle of the token layer, not a per-screen judgement call: there
are "chrome" surface tokens and "panel" surface tokens, and the decision of which
to use is made once per surface type.

Rollout is whole-app (admin, the public participant root `/`, the auth/signin
screen, all dialogs, all four maps) and phased in one effort in the order the
dependencies run: token layer + fonts + `globals.css` → atoms/molecules →
organisms/pages → maps + overlays.
