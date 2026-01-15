/**
 * Checkout Session Completed Handler - AGPL-3.0 Licensed
 *
 * Handler for Stripe checkout.session.completed webhook events.
 * Note: AI Phone and Credits functionality has been removed.
 *
 * @module @calcom/features/billing/api/webhook
 * @license AGPL-3.0
 */

import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";

import { CHECKOUT_SESSION_TYPES } from "../../constants";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";

const log = logger.getSubLogger({ prefix: ["checkout.session.completed"] });

/**
 * Handle checkout session completed events.
 */
const handler = async (data: SWHMap["checkout.session.completed"]["data"]) => {
  const session = data.object;

  // Store ad tracking data in Stripe customer metadata for Zapier tracking
  if (session.customer && session.metadata) {
    try {
      const trackingMetadata = {
        gclid: session.metadata?.gclid,
        campaignId: session.metadata?.campaignId,
        liFatId: session.metadata?.liFatId,
        linkedInCampaignId: session.metadata?.linkedInCampaignId,
      };

      const cleanedMetadata = Object.fromEntries(
        Object.entries(trackingMetadata).filter(([_, value]) => value)
      );

      if (Object.keys(cleanedMetadata).length > 0) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
        await stripe.customers.update(customerId, {
          metadata: cleanedMetadata,
        });
      }
    } catch (error) {
      log.error("Failed to update Stripe customer metadata with ad tracking data", { error });
    }
  }

  // Handle team creation checkout
  if (session.metadata?.type === CHECKOUT_SESSION_TYPES.TEAM_CREATION) {
    return await handleTeamCreationCheckoutSessionComplete(session);
  }

  // Note: AI Phone and Credits handling has been removed from this AGPL version
  // If you need credits functionality, implement it separately

  log.info(`Checkout session completed: ${session.id}`, {
    type: session.metadata?.type,
    mode: session.mode,
  });

  return { success: true };
};

/**
 * Handle team creation checkout session completion.
 */
async function handleTeamCreationCheckoutSessionComplete(
  session: SWHMap["checkout.session.completed"]["data"]["object"]
) {
  log.info("Team creation checkout session completed - handled via redirect flow", {
    sessionId: session.id,
    teamName: session.metadata?.teamName,
    teamSlug: session.metadata?.teamSlug,
  });
  return { success: true, message: "Team checkout handled via redirect" };
}

export default handler;
