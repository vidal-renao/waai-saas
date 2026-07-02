import pkg from "../../package.json";

/**
 * Single source of truth for the running application version.
 *
 * Reads from package.json at build time so the value can never drift from the
 * released artifact (DEBT-015). Consumed by the health endpoint and, later,
 * by Sentry release tagging.
 */
export const APP_VERSION: string = pkg.version;
