/**
 * Organization Domain Utilities - Unit Tests
 *
 * Tests for the clean-room implementation of orgDomains.ts
 *
 * @module @calcom/lib/orgDomains.test
 * @license AGPL-3.0
 */
import { describe, expect, it, beforeEach } from "vitest";

import {
  getOrgSlug,
  getOrgDomainConfigFromHostname,
  getOrgFullOrigin,
  subdomainSuffix,
  getSlugOrRequestedSlug,
  whereClauseForOrgWithSlugOrRequestedSlug,
} from "@calcom/lib/orgDomains";
import * as constants from "@calcom/lib/constants";

/**
 * Helper to mock environment constants for testing
 */
function setupTestEnv({
  WEBAPP_URL = "https://app.cal.com",
  WEBSITE_URL = "https://cal.com",
  ALLOWED_HOSTNAMES = [
    "cal.com",
    "cal.dev",
    "cal-staging.com",
    "cal.community",
    "cal.local:3000",
    "localhost:3000",
  ],
  RESERVED_SUBDOMAINS = [
    "app",
    "auth",
    "docs",
    "design",
    "console",
    "go",
    "status",
    "api",
    "saml",
    "www",
    "matrix",
    "developer",
    "cal",
    "my",
    "team",
    "support",
    "security",
    "blog",
    "learn",
    "admin",
  ],
} = {}) {
  Object.defineProperty(constants, "WEBAPP_URL", { value: WEBAPP_URL, configurable: true });
  Object.defineProperty(constants, "WEBSITE_URL", { value: WEBSITE_URL, configurable: true });
  Object.defineProperty(constants, "ALLOWED_HOSTNAMES", { value: ALLOWED_HOSTNAMES, configurable: true });
  Object.defineProperty(constants, "RESERVED_SUBDOMAINS", { value: RESERVED_SUBDOMAINS, configurable: true });
  Object.defineProperty(constants, "SINGLE_ORG_SLUG", { value: undefined, configurable: true });
  Object.defineProperty(constants, "IS_PRODUCTION", { value: true, configurable: true });
}

describe("Organization Domain Utilities", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  describe("getOrgSlug", () => {
    it("should extract slug from valid org subdomain", () => {
      setupTestEnv();
      expect(getOrgSlug("acme.cal.com")).toBe("acme");
    });

    it("should return null for hostname without dots", () => {
      setupTestEnv();
      expect(getOrgSlug("localhost")).toBeNull();
    });

    it("should return null for non-matching domain", () => {
      setupTestEnv();
      // cal.dev is in allowed hostnames but WEBAPP_URL is app.cal.com
      expect(getOrgSlug("acme.cal.dev")).toBeNull();
    });

    it("should handle local development with port", () => {
      setupTestEnv({ WEBAPP_URL: "http://app.cal.local:3000" });
      expect(getOrgSlug("acme.cal.local:3000")).toBe("acme");
    });

    it("should return null for mismatched port", () => {
      setupTestEnv({ WEBAPP_URL: "http://app.cal.local:3000" });
      expect(getOrgSlug("acme.cal.com:3000")).toBeNull();
    });

    it("should return null for slugs containing dots", () => {
      setupTestEnv();
      // This would be "sub.acme" which contains a dot
      expect(getOrgSlug("sub.acme.cal.com")).toBeNull();
    });
  });

  describe("getOrgDomainConfigFromHostname", () => {
    it("should return valid config for org subdomain", () => {
      setupTestEnv();
      const result = getOrgDomainConfigFromHostname({ hostname: "acme.cal.com" });
      expect(result).toEqual({
        currentOrgDomain: "acme",
        isValidOrgDomain: true,
      });
    });

    it("should return invalid config for reserved subdomain", () => {
      setupTestEnv();
      const result = getOrgDomainConfigFromHostname({ hostname: "app.cal.com" });
      expect(result).toEqual({
        currentOrgDomain: null,
        isValidOrgDomain: false,
      });
    });

    it("should return invalid config for localhost", () => {
      setupTestEnv();
      const result = getOrgDomainConfigFromHostname({ hostname: "localhost:3000" });
      expect(result).toEqual({
        currentOrgDomain: null,
        isValidOrgDomain: false,
      });
    });

    it("should use fallback when hostname is invalid", () => {
      setupTestEnv();
      const result = getOrgDomainConfigFromHostname({
        hostname: "localhost:3000",
        fallback: "fallback-org",
      });
      expect(result).toEqual({
        currentOrgDomain: "fallback-org",
        isValidOrgDomain: true,
      });
    });

    it("should reject reserved subdomain as fallback", () => {
      setupTestEnv();
      const result = getOrgDomainConfigFromHostname({
        hostname: "localhost:3000",
        fallback: "app", // reserved
      });
      expect(result).toEqual({
        currentOrgDomain: null,
        isValidOrgDomain: false,
      });
    });
  });

  describe("getOrgFullOrigin", () => {
    it("should return WEBSITE_URL when slug is null", () => {
      setupTestEnv({
        WEBAPP_URL: "https://app.cal.com",
        WEBSITE_URL: "https://abc.com",
      });
      expect(getOrgFullOrigin(null)).toBe("https://abc.com");
    });

    it("should return org origin with protocol", () => {
      setupTestEnv({
        WEBAPP_URL: "https://app.cal-app.com",
        WEBSITE_URL: "https://cal.com",
      });
      expect(getOrgFullOrigin("org")).toBe("https://org.cal-app.com");
    });

    it("should return org origin without protocol when specified", () => {
      setupTestEnv({
        WEBAPP_URL: "https://app.cal.com",
        WEBSITE_URL: "https://cal.com",
      });
      expect(getOrgFullOrigin("acme", { protocol: false })).toBe("acme.cal.com");
    });

    it("should return WEBSITE_URL without protocol when slug is null", () => {
      setupTestEnv({
        WEBAPP_URL: "https://app.cal.com",
        WEBSITE_URL: "https://example.com",
      });
      expect(getOrgFullOrigin(null, { protocol: false })).toBe("example.com");
    });
  });

  describe("subdomainSuffix", () => {
    it("should extract suffix from 3-part domain", () => {
      setupTestEnv({ WEBAPP_URL: "https://app.cal.com" });
      expect(subdomainSuffix()).toBe("cal.com");
    });

    it("should return full domain for 2-part domain", () => {
      setupTestEnv({ WEBAPP_URL: "https://cal.com" });
      expect(subdomainSuffix()).toBe("cal.com");
    });

    it("should handle localhost with port", () => {
      setupTestEnv({ WEBAPP_URL: "http://localhost:3000" });
      expect(subdomainSuffix()).toBe("localhost:3000");
    });
  });

  describe("getSlugOrRequestedSlug", () => {
    it("should return Prisma WHERE clause with OR conditions", () => {
      const result = getSlugOrRequestedSlug("my-org");
      expect(result).toHaveProperty("OR");
      expect(result.OR).toHaveLength(2);
      expect(result.OR?.[0]).toEqual({ slug: "my-org" });
      expect(result.OR?.[1]).toEqual({
        metadata: {
          path: ["requestedSlug"],
          equals: "my-org",
        },
      });
    });

    it("should slugify the input", () => {
      const result = getSlugOrRequestedSlug("My Org Name");
      expect(result.OR?.[0]).toEqual({ slug: "my-org-name" });
    });
  });

  describe("whereClauseForOrgWithSlugOrRequestedSlug", () => {
    it("should include isOrganization filter", () => {
      const result = whereClauseForOrgWithSlugOrRequestedSlug("my-org");
      expect(result).toHaveProperty("isOrganization", true);
      expect(result).toHaveProperty("OR");
    });

    it("should have both slug and requestedSlug conditions", () => {
      const result = whereClauseForOrgWithSlugOrRequestedSlug("test-org");
      expect(result.OR).toHaveLength(2);
      expect(result.OR?.[0]).toEqual({ slug: "test-org" });
      expect(result.OR?.[1]).toHaveProperty("metadata");
    });
  });
});
