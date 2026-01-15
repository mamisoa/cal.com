/**
 * getBookerBaseUrlSync - AGPL-3.0 Licensed
 *
 * Utility to get the booker base URL for an organization.
 * This is a simple wrapper around getOrgFullOrigin for convenience.
 *
 * @module @calcom/lib/getBookerBaseUrlSync
 * @license AGPL-3.0
 */

import { getOrgFullOrigin } from "@calcom/lib/orgDomains";

/**
 * Get the booker base URL for an organization.
 *
 * @param orgSlug - The organization slug, or null for the main site
 * @param options - Configuration options
 * @param options.protocol - Whether to include the protocol (default: true)
 * @returns The full origin URL for the organization's booker
 *
 * @example
 * // With WEBAPP_URL = "https://app.cal.com"
 * getBookerBaseUrlSync("acme") // "https://acme.cal.com"
 * getBookerBaseUrlSync("acme", { protocol: false }) // "acme.cal.com"
 * getBookerBaseUrlSync(null) // "https://cal.com"
 */
export const getBookerBaseUrlSync = (
  orgSlug: string | null,
  options?: {
    protocol: boolean;
  }
): string => {
  return getOrgFullOrigin(orgSlug ?? "", options);
};
