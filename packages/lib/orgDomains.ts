/**
 * Organization Domain Utilities (Clean-Room Implementation)
 *
 * AGPL-3.0 licensed utilities for organization domain management.
 * Handles URL/domain parsing and Prisma query building for multi-tenant organizations.
 *
 * This module provides functionality to:
 * - Extract organization slugs from hostnames
 * - Validate organization domains against allowed/reserved lists
 * - Build Prisma WHERE clauses for organization queries
 * - Construct full origin URLs for organizations
 *
 * @module @calcom/lib/orgDomains
 * @license AGPL-3.0
 */
import type { IncomingMessage } from "node:http";

import { IS_PRODUCTION, WEBSITE_URL, SINGLE_ORG_SLUG } from "@calcom/lib/constants";
import { ALLOWED_HOSTNAMES, RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";
import type { Prisma } from "@calcom/prisma/client";

const log = logger.getSubLogger({
  prefix: ["orgDomains"],
});

/**
 * Result type for organization domain configuration
 */
export interface OrgDomainConfig {
  /** The current organization domain/slug, or null if not valid */
  currentOrgDomain: string | null;
  /** Whether the domain is a valid organization domain */
  isValidOrgDomain: boolean;
}

/**
 * Extracts the base domain suffix from the WEBAPP_URL.
 *
 * For example:
 * - WEBAPP_URL = "https://app.cal.com" -> "cal.com"
 * - WEBAPP_URL = "https://app.example.org" -> "example.org"
 * - WEBAPP_URL = "http://localhost:3000" -> "localhost:3000"
 *
 * @returns The domain suffix to use for organization subdomains
 */
export function subdomainSuffix(): string {
  // Support local testing with custom domain
  if (!IS_PRODUCTION && process.env.LOCAL_TESTING_DOMAIN_VERCEL) {
    return process.env.LOCAL_TESTING_DOMAIN_VERCEL;
  }

  // Remove protocol and split by dots
  const domainWithoutProtocol = WEBAPP_URL.replace(/^https?:\/\//, "");
  const parts = domainWithoutProtocol.split(".");

  // If we have 3+ parts (e.g., app.cal.com), return everything after the first part
  // Otherwise return the whole domain (e.g., localhost:3000)
  if (parts.length >= 3) {
    return parts.slice(1).join(".");
  }
  return parts.join(".");
}

/**
 * Finds the matching allowed hostname for the current WEBAPP_URL.
 *
 * Compares the WEBAPP_URL against the list of ALLOWED_HOSTNAMES to determine
 * which base domain is being used.
 *
 * @returns The matching allowed hostname, or null if none match
 */
function findMatchingAllowedHostname(): string | null {
  try {
    const webappUrlObj = new URL(WEBAPP_URL);
    const webappHost = webappUrlObj.port
      ? `${webappUrlObj.hostname}:${webappUrlObj.port}`
      : webappUrlObj.hostname;

    // Find an allowed hostname that the webapp URL ends with
    const match = ALLOWED_HOSTNAMES.find((allowedHost) => webappHost.endsWith(`.${allowedHost}`));

    return match || null;
  } catch {
    log.error("Failed to parse WEBAPP_URL", { WEBAPP_URL });
    return null;
  }
}

/**
 * Extracts the organization slug from a hostname.
 *
 * The slug is the subdomain portion of the hostname that identifies
 * the organization. For example, "acme.cal.com" -> "acme".
 *
 * Special cases:
 * - If SINGLE_ORG_SLUG is set, always returns that value (single-org mode)
 * - If forcedSlug is provided in E2E/test mode, uses that value
 * - Returns null for hostnames without dots (e.g., "localhost")
 * - Returns null if the hostname doesn't match any allowed hostname
 * - Returns null if the extracted slug contains dots
 *
 * @param hostname - The hostname to extract the slug from
 * @param forcedSlug - Optional slug to force (only works in E2E/test mode)
 * @returns The organization slug, or null if not determinable
 */
export function getOrgSlug(hostname: string, forcedSlug?: string): string | null {
  // Handle forced slug for testing environments
  if (forcedSlug) {
    const isTestMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;
    if (isTestMode) {
      log.debug("Using forced slug in test mode", { forcedSlug });
      return forcedSlug;
    }
    log.debug("Ignoring forced slug outside test mode", { forcedSlug });
  }

  // Single organization mode - always return the configured slug
  if (SINGLE_ORG_SLUG) {
    log.debug("Single org mode active", { SINGLE_ORG_SLUG });
    return SINGLE_ORG_SLUG;
  }

  // Hostnames without dots cannot be org domains (e.g., "localhost")
  if (!hostname.includes(".")) {
    log.warn("Hostname has no dots, cannot be org domain", { hostname });
    return null;
  }

  // Find which allowed hostname matches our webapp URL
  const matchingHostname = findMatchingAllowedHostname();
  if (!matchingHostname) {
    log.warn("No matching allowed hostname found", { WEBAPP_URL, ALLOWED_HOSTNAMES });
    return null;
  }

  // Extract the slug by removing the base hostname suffix
  const suffix = `.${matchingHostname}`;
  if (!hostname.endsWith(suffix)) {
    // The request hostname doesn't match our expected base domain
    return null;
  }

  const slug = hostname.slice(0, -suffix.length);

  // Slugs should not contain dots (that would indicate nested subdomains)
  if (slug.includes(".")) {
    log.warn("Extracted slug contains dots, not valid", { slug });
    return null;
  }

  return slug || null;
}

/**
 * Checks if a slug is reserved and cannot be used as an organization domain.
 *
 * @param slug - The slug to check
 * @returns true if the slug is reserved, false otherwise
 */
function isReservedSubdomain(slug: string): boolean {
  return RESERVED_SUBDOMAINS.includes(slug);
}

/**
 * Gets the organization domain configuration from a hostname.
 *
 * Extracts the organization slug and validates it against reserved subdomains.
 * Optionally falls back to a provided slug if the hostname doesn't yield a valid org.
 *
 * @param params - Configuration parameters
 * @param params.hostname - The hostname to parse
 * @param params.fallback - Optional fallback slug(s) if hostname parsing fails
 * @param params.forcedSlug - Optional forced slug for testing
 * @returns Organization domain configuration
 */
export function getOrgDomainConfigFromHostname({
  hostname,
  fallback,
  forcedSlug,
}: {
  hostname: string;
  fallback?: string | string[];
  forcedSlug?: string;
}): OrgDomainConfig {
  const extractedSlug = getOrgSlug(hostname, forcedSlug);
  const isValid = extractedSlug !== null && !isReservedSubdomain(extractedSlug);

  // If we found a valid org domain, return it
  if (isValid) {
    return {
      currentOrgDomain: extractedSlug,
      isValidOrgDomain: true,
    };
  }

  // If no valid domain and no fallback, return invalid
  if (!fallback) {
    return {
      currentOrgDomain: null,
      isValidOrgDomain: false,
    };
  }

  // Try the fallback
  const fallbackSlug = Array.isArray(fallback) ? fallback[0] : fallback;
  const isFallbackValid = fallbackSlug && !isReservedSubdomain(fallbackSlug);

  return {
    currentOrgDomain: isFallbackValid ? fallbackSlug : null,
    isValidOrgDomain: !!isFallbackValid,
  };
}

/**
 * Checks if a request is from the Cal.com Platform (has client ID header).
 *
 * @param req - The incoming HTTP request
 * @returns true if this is a platform request
 */
function isPlatformRequest(req: IncomingMessage | undefined): boolean {
  return !!req?.headers?.["x-cal-client-id"];
}

/**
 * Gets the organization domain configuration with platform support.
 *
 * This is the main entry point for getting org domain config. It supports:
 * - Platform requests with forced slugs
 * - Regular hostname-based org detection
 * - Fallback slugs
 *
 * @param params - Configuration parameters
 * @param params.hostname - The hostname to parse
 * @param params.fallback - Optional fallback slug(s)
 * @param params.forcedSlug - Optional forced slug
 * @param params.isPlatform - Whether this is a platform request
 * @returns Organization domain configuration
 */
export function getOrgDomainConfig({
  hostname,
  fallback,
  forcedSlug,
  isPlatform,
}: {
  hostname: string;
  fallback?: string | string[];
  forcedSlug?: string;
  isPlatform?: boolean;
}): OrgDomainConfig {
  // Platform requests with forced slug bypass normal detection
  if (isPlatform && forcedSlug) {
    return {
      currentOrgDomain: forcedSlug,
      isValidOrgDomain: true,
    };
  }

  return getOrgDomainConfigFromHostname({ hostname, fallback, forcedSlug });
}

/**
 * Gets organization domain configuration from an HTTP request.
 *
 * @deprecated Use `getOrgDomainConfig` instead for more flexibility.
 *
 * @param req - The incoming HTTP request
 * @param fallback - Optional fallback slug(s)
 * @returns Organization domain configuration
 */
export function orgDomainConfig(
  req: IncomingMessage | undefined,
  fallback?: string | string[]
): OrgDomainConfig {
  const forPlatform = isPlatformRequest(req);

  // Extract forced slug from header
  const forcedSlugHeader = req?.headers?.["x-cal-force-slug"];
  const forcedSlug = Array.isArray(forcedSlugHeader) ? forcedSlugHeader[0] : forcedSlugHeader;

  // Platform requests with forced slug bypass normal detection
  if (forPlatform && forcedSlug) {
    return {
      currentOrgDomain: forcedSlug,
      isValidOrgDomain: true,
    };
  }

  const hostname = req?.headers?.host || "";
  return getOrgDomainConfigFromHostname({ hostname, fallback, forcedSlug });
}

/**
 * Constructs the full origin URL for an organization.
 *
 * @param slug - The organization slug, or null for the main site
 * @param options - Configuration options
 * @param options.protocol - Whether to include the protocol (default: true)
 * @returns The full origin URL
 *
 * @example
 * // With WEBAPP_URL = "https://app.cal.com", WEBSITE_URL = "https://cal.com"
 * getOrgFullOrigin("acme") // "https://acme.cal.com"
 * getOrgFullOrigin("acme", { protocol: false }) // "acme.cal.com"
 * getOrgFullOrigin(null) // "https://cal.com"
 */
export function getOrgFullOrigin(
  slug: string | null,
  options: { protocol: boolean } = { protocol: true }
): string {
  // No slug means return the main website URL
  if (!slug) {
    if (options.protocol) {
      return WEBSITE_URL;
    }
    return WEBSITE_URL.replace(/^https?:\/\//, "");
  }

  // Build the org-specific origin
  const suffix = subdomainSuffix();
  const domain = `${slug}.${suffix}`;

  if (options.protocol) {
    try {
      const websiteUrlObj = new URL(WEBSITE_URL);
      return `${websiteUrlObj.protocol}//${domain}`;
    } catch {
      // Fallback to https if URL parsing fails
      return `https://${domain}`;
    }
  }

  return domain;
}

/**
 * Builds a Prisma WHERE clause to find a team by slug or requested slug.
 *
 * This searches for teams where either:
 * - The slug field matches the provided slug
 * - The metadata.requestedSlug field matches the provided slug
 *
 * @deprecated Use `whereClauseForOrgWithSlugOrRequestedSlug` instead to ensure
 * you only match organizations and not regular teams.
 *
 * @param slug - The slug to search for
 * @returns A Prisma TeamWhereInput clause
 */
export function getSlugOrRequestedSlug(slug: string): Prisma.TeamWhereInput {
  const normalizedSlug = slugify(slug);

  return {
    OR: [
      { slug: normalizedSlug },
      {
        metadata: {
          path: ["requestedSlug"],
          equals: normalizedSlug,
        },
      },
    ],
  };
}

/**
 * Builds a Prisma WHERE clause to find an organization by slug or requested slug.
 *
 * Similar to `getSlugOrRequestedSlug` but adds `isOrganization: true` filter
 * to ensure only organizations are matched, not regular teams.
 *
 * @param slug - The slug to search for
 * @returns A Prisma TeamWhereInput clause for organizations only
 */
export function whereClauseForOrgWithSlugOrRequestedSlug(slug: string): Prisma.TeamWhereInput {
  const normalizedSlug = slugify(slug);

  return {
    OR: [
      { slug: normalizedSlug },
      {
        metadata: {
          path: ["requestedSlug"],
          equals: slug, // Note: uses original slug for requestedSlug
        },
      },
    ],
    isOrganization: true,
  };
}

/**
 * Builds a Prisma query for finding the user's organization from a request.
 *
 * Combines `orgDomainConfig` and `getSlugOrRequestedSlug` to create a
 * ready-to-use Prisma WHERE clause based on the request's hostname.
 *
 * @param req - The incoming HTTP request
 * @param fallback - Optional fallback slug(s)
 * @returns A Prisma TeamWhereInput clause, or null if no valid org domain
 */
export function userOrgQuery(
  req: IncomingMessage | undefined,
  fallback?: string | string[]
): Prisma.TeamWhereInput | null {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, fallback);

  if (isValidOrgDomain && currentOrgDomain) {
    return getSlugOrRequestedSlug(currentOrgDomain);
  }

  return null;
}
