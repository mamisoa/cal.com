/**
 * Payment Intent Succeeded Handler - AGPL-3.0 Licensed
 *
 * Handler for Stripe payment_intent.succeeded webhook events.
 *
 * @module @calcom/features/billing/api/webhook
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";

import type { SWHMap } from "./__handler";

const log = logger.getSubLogger({ prefix: ["payment_intent.succeeded"] });

/**
 * Handle payment intent succeeded events.
 * This is a placeholder for custom payment intent handling.
 */
const handler = async (data: SWHMap["payment_intent.succeeded"]["data"]) => {
  const paymentIntent = data.object;
  log.info(`Payment intent succeeded: ${paymentIntent.id}`);
  return { success: true };
};

export default handler;
