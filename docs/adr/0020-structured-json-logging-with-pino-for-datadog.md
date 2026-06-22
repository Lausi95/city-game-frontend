# Structured JSON logging with pino, shaped for Datadog

The app had no logging foundation — a single `console.log` in the
`[...nextauth]` route handler (marked `TEMP`, see
[ADR 0019](./0019-auth-derives-external-origin-from-forwarded-host.md)) and
nothing else. Production runs as a standalone container behind traefik on a
dedicated server ([ADR 0018](./0018-containerized-deployment-behind-traefik.md)),
where a host-level Datadog Agent tails each container's stdout. To make
production logs queryable in Datadog we introduce one structured logger that
emits newline-delimited JSON to stdout; the Agent ingests it with no per-request
shipping from the app.

We use **pino** through a single base logger in `app/lib/logger.ts` — the one
place that owns format, level, and redaction, mirroring how `tenant.ts` /
`origin.ts` centralise other cross-cutting concerns. pino over a hand-rolled
`JSON.stringify` logger was a deliberate call for its battle-tested serializers,
level handling, and redaction, accepting the bundling constraints below.

**The Agent runs a generic JSON pipeline** (no pino-specific remappers), so the
log line must already carry Datadog's reserved attribute names — we do not rely
on a Datadog-side pipeline that lives outside this repo, isn't code-reviewed, and
would silently break ingestion if edited. pino is configured to emit:
`messageKey: "message"` (not `msg`); `formatters.level → { status: label }` so
the level is the string Datadog's status remapper expects (not pino's numeric
`level: 30`); and an ISO timestamp under the key **`date`** — Datadog's default
date remapper recognises `date`/`timestamp` but **not** pino's `time`, so leaving
it as `time` would stamp every log with ingestion time instead of event time.
`service`/`env`/`version` are **not** put in the log body — they are Datadog
unified service tags set at the Agent/container level, already present. Datadog
infrastructure (Agent, pipeline, service tagging, `docker-compose` wiring) is
pre-existing and out of scope for this change.

Two production constraints the design must respect, both of which fail only at
runtime in the container, not at build:

- **pino must be listed in `serverExternalPackages` in `next.config`.** Under
  `output: "standalone"`, bundling pino breaks its runtime module resolution and
  the container throws on the first log call. Externalising it is the fix.
- **No in-process pretty transport in production.** `pino.transport()` /
  `pino-pretty` workers do not survive standalone tracing. Production is a plain
  `pino()` writing JSON synchronously to stdout. Dev pretty-printing is a **CLI
  pipe** in the `dev` script (`next dev | pino-pretty`, a devDependency), so the
  prod and dev code paths construct pino identically — only the downstream pipe
  differs. The format switch keys off **`NODE_ENV`** (no new env for format);
  level is `info` in prod / `debug` in dev, overridable via a **`LOG_LEVEL`** env
  var so prod can drop to `debug` (container restart) without a code change.

**Edge runtime is out of scope.** pino cannot run on Next.js's edge runtime, so
`proxy.ts` (middleware) is not instrumented — it is auth-only and near-silent, and
contorting the design for it isn't worth it.

Conventions this establishes, enforced by review:

- **Redaction is configured, not just convention.** pino `redact` strips the
  app's secret-bearing keys (`authorization`, `cookie`, `set-cookie`,
  `*.accessToken`, `*.id_token`, `*.token`, …) as a backstop — a token reaching
  Datadog is retained/indexed and is a real incident. The "never log token/header
  objects" rule still stands; redaction covers the slip.
- **Participant PII stays out of log bodies.** Coordinates, `memberId`, `agentId`
  are not secrets (so not redacted) but must not be logged; log `gameId`,
  `tenant`, `route`, `status` instead — enough to diagnose without shipping PII.
- **Errors use pino's `err` serializer**: `logger.error({ err }, "message")`, never
  `logger.error(err.message)`, so stacks land as structured fields.
- **Initial instrumentation is the backend boundary only** — log non-2xx backend
  responses and thrown `fetch` errors (`backend.ts`, the participant routes);
  no per-request access logging (traefik/Agent already have that). The `TEMP`
  auth-headers `console.log` becomes `logger.debug` (off in prod) until ADR 0019
  closes and it is deleted.
