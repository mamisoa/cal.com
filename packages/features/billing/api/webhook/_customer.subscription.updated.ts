/**
 * Subscription Updated Handler - AGPL-3.0 Licensed
 *
 * Handler for Stripe customer.subscription.updated webhook events.
 * Note: AI Phone functionality has been removed.
 *
 * @module @calcom/features/billing/api/webhook
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";

import type { SWHMap } from "./__handler";

type Data = SWHMap["customer.subscription.updated"]["data"];

const log = logger.getSubLogger({ prefix: ["customer.subscription.updated"] });

/**
 * Handle subscription update events.
 * This handler is simplified without AI Phone functionality.
 */
const handler = async (data: Data) => {
  const subscription = data.object;

  log.info(`Subscription updated: ${subscription.id}`, {
    status: subscription.status,
    customerId: subscription.customer,
  });

  // Note: AI Phone subscription handling has been removed from this AGPL version
  // Team subscription updates are typically handled through the TeamBillingService directly

  return { success: true, subscriptionId: subscription.id };
};

export default handler;
