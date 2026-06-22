import pino from 'pino';

/**
 * The single structured logger for the app. See
 * docs/adr/0020-structured-json-logging-with-pino-for-datadog.md.
 *
 * Production emits newline-delimited JSON to stdout; the host Datadog Agent tails
 * the container's stdout (ADR 0018). The Agent runs a *generic* JSON pipeline, so
 * the line must already carry Datadog's reserved attribute names — we never rely
 * on a Datadog-side remapper:
 *   - level  -> `status` (string label, not pino's numeric `level: 30`)
 *   - message-> `message` (not pino's `msg`)
 *   - time   -> ISO string under `date` (Datadog's default date remapper
 *               recognises `date`/`timestamp` but NOT pino's `time`, so leaving it
 *               as `time` would stamp logs with ingestion time, not event time)
 *
 * The config is identical in dev and prod — only the level and the downstream
 * pipe differ. Dev pretty-printing is the `dev` npm script piping to `pino-pretty`
 * (a devDependency); we deliberately configure NO in-process transport, which
 * does not survive Next.js `output: "standalone"` tracing.
 *
 * `service`/`env`/`version` are NOT logged here — they are Datadog unified service
 * tags set at the Agent/container level.
 *
 * pino must be listed in `serverExternalPackages` in next.config.ts, or bundling
 * breaks its runtime module resolution and the container throws on the first log.
 */
const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  messageKey: 'message',
  // ISO timestamp under the `date` key (see header).
  timestamp: () => `,"date":"${new Date().toISOString()}"`,
  formatters: {
    // Emit the level as the string label Datadog's status remapper expects.
    level: (label) => ({ status: label }),
  },
  // Defense-in-depth backstop for the "never log token/header objects" rule.
  // A token reaching Datadog is retained/indexed — a real incident, not cosmetic.
  redact: {
    paths: [
      'authorization',
      'cookie',
      '["set-cookie"]',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'id_token',
      'token',
      '*.authorization',
      '*.cookie',
      '*.accessToken',
      '*.access_token',
      '*.refreshToken',
      '*.id_token',
      '*.token',
    ],
    censor: '[Redacted]',
  },
  // Log thrown errors as structured fields: logger.error({ err }, "message").
  serializers: { err: pino.stdSerializers.err },
});

/**
 * Log a failed backend call at the one boundary that matters for diagnosing prod.
 *
 * Severity follows the failure: a thrown fetch (network/DNS) or a backend 5xx is
 * an `error`; any other handled non-2xx is a `warn`. The public participant routes
 * should only call this for server faults — their 4xx (404 not-in-game, 409
 * already-found, 422 not-active) are expected, client-tailored business outcomes,
 * not log-worthy. The admin path (backend.ts) calls it for every non-2xx.
 *
 * Logs only non-PII context — `route`, `status`, and the backend `path`. Never
 * pass participant coordinates, `memberId`, or `agentId` (ADR 0020): they are not
 * secrets (so not redacted) but must not be shipped to Datadog.
 */
export function logBackendError(
  route: string,
  fields: { status?: number; path?: string; err?: unknown },
): void {
  const isFault = fields.err != null || (fields.status ?? 0) >= 500;
  if (isFault) {
    logger.error({ route, ...fields }, 'backend call failed');
  } else {
    logger.warn({ route, ...fields }, 'backend call failed');
  }
}
