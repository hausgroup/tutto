/**
 * Server-only Siigo integration layer.
 * UI and client code must never import from this folder directly.
 */

export class SiigoNotConfiguredError extends Error {
  constructor() {
    super("Siigo credentials are not configured.");
    this.name = "SiigoNotConfiguredError";
  }
}

export function assertSiigoConfigured() {
  const { SIIGO_USERNAME, SIIGO_ACCESS_KEY, SIIGO_PARTNER_ID } = process.env;
  if (!SIIGO_USERNAME || !SIIGO_ACCESS_KEY || !SIIGO_PARTNER_ID) {
    throw new SiigoNotConfiguredError();
  }
  return {
    username: SIIGO_USERNAME,
    accessKey: SIIGO_ACCESS_KEY,
    partnerId: SIIGO_PARTNER_ID,
  };
}
