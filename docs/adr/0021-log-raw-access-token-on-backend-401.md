---
status: accepted (amends 0020-structured-json-logging-with-pino-for-datadog)
---

# Log the raw operator access token on backend 401

When a backend call returns `401`, `authedFetch` logs the **raw operator
Keycloak access token** so it can be inspected directly (e.g. pasted into a JWT
decoder or replayed against the backend) while diagnosing why the token was
rejected. This is a deliberate, operator-accepted reversal of the "never log
secrets" rule in [ADR 0020](0020-structured-json-logging-with-pino-for-datadog.md):
the `accessToken`/`token` entries are removed from the pino `redact` list so the
value is emitted verbatim, in **all environments including production**.

## Considered options

- **Decoded claims only (no signature).** Log `exp`/`iss`/`aud`/`azp`/`scope` —
  enough to answer every "why was this 401" question without emitting a
  replayable credential. Rejected: the operator wanted the raw token to replay
  requests as that operator, which the decoded form cannot do.
- **Dev-only raw token.** Guard the log behind `NODE_ENV !== 'production'` so it
  never reaches Datadog. Rejected: the operator wanted it available in prod too.
- **Dedicated unredacted key** (keep the redact list, log under a new key).
  Rejected in favour of stripping the redact entries globally.

## Consequences

- **The token is a live bearer credential.** It grants access to the `/games/**`
  admin surface as that operator until `exp`. It now lands in container stdout,
  which the host Datadog Agent tails and indexes ([ADR 0018](0018-containerized-deployment-behind-traefik.md)).
  Anyone with Datadog read access — and Datadog itself, which retains it — can
  copy it and act as that operator. This is the exfiltration path that
  [authedFetch](../../app/lib/authedFetch.ts) was originally built to close (the
  token is kept out of the NextAuth session precisely so it can't reach a client).
- **The redact backstop is weakened app-wide.** Removing `accessToken`/`token`
  from the redact paths means any *accidental* token logged anywhere else in the
  app, now or in future, also prints in clear. The backstop no longer backs up.
- This applies only to the **backend-returned** 401. The synthetic no-token 401
  in `authedFetch` (no access token present) has nothing to print and is skipped.
- Mitigations that would reduce but not eliminate the exposure (not currently
  taken): short token TTL, restricting Datadog log access, scrubbing the index.
