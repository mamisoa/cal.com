/**
 * Team Payments Stub - AGPL-3.0 Licensed
 *
 * Stub implementation of team payment functions for self-hosted deployments.
 * All payment operations return null/no-op since self-hosted instances
 * don't use Cal.com's Stripe billing infrastructure.
 *
 * @module @calcom/features/teams/lib/payments
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";
import type { BillingPeriod } from "@calcom/prisma/zod-utils";
import type { TrackingData } from "@calcom/lib/tracking";

const log = logger.getSubLogger({ prefix: ["teams/lib/payments"] });

/**
 * Check if team payment is required - always returns null for self-hosted
 * @param params - Team ID parameters
 * @returns Object with null URL (no payment required)
 */
export const checkIfTeamPaymentRequired = async ({ teamId = -1 }: { teamId?: number }) => {
  log.debug(`checkIfTeamPaymentRequired called for team ${teamId} (no-op in self-hosted mode)`);
  return { url: null };
};

/**
 * Generate team checkout session - stub for self-hosted
 * Returns object with null URL since no Stripe checkout is needed
 */
export const generateTeamCheckoutSession = async ({
  teamName,
  teamSlug,
  userId,
  isOnboarding,
  tracking,
}: {
  teamName: string;
  teamSlug: string;
  userId: number;
  isOnboarding?: boolean;
  tracking?: TrackingData;
}): Promise<{ url: string | null }> => {
  log.debug(`generateTeamCheckoutSession called (no-op in self-hosted mode)`, {
    teamName,
    teamSlug,
    userId,
    isOnboarding,
  });
  return { url: null };
};

/**
 * Purchase team or org subscription - stub for self-hosted
 * Returns null URL since no Stripe checkout is needed
 */
export const purchaseTeamOrOrgSubscription = async (input: {
  teamId: number;
  seatsUsed: number;
  seatsToChargeFor?: number | null;
  userId: number;
  isOrg?: boolean;
  pricePerSeat: number | null;
  billingPeriod?: BillingPeriod;
  tracking?: TrackingData;
}) => {
  log.debug(`purchaseTeamOrOrgSubscription called for team ${input.teamId} (no-op in self-hosted mode)`);
  return { url: null };
};

/**
 * Get team with payment metadata - stub for self-hosted
 * Returns team without payment metadata since billing is disabled
 */
export const getTeamWithPaymentMetadata = async (teamId: number) => {
  log.debug(`getTeamWithPaymentMetadata called for team ${teamId} (no-op in self-hosted mode)`);
  // Return a minimal structure that won't break callers
  return {
    metadata: {
      paymentId: null,
      subscriptionId: null,
      subscriptionItemId: null,
      orgSeats: null,
    },
    members: [],
    isOrganization: false,
  };
};

/**
 * Update quantity subscription from Stripe - stub for self-hosted
 * No-op since there's no Stripe subscription to update
 */
export const updateQuantitySubscriptionFromStripe = async (teamId: number) => {
  log.debug(`updateQuantitySubscriptionFromStripe called for team ${teamId} (no-op in self-hosted mode)`);
};
