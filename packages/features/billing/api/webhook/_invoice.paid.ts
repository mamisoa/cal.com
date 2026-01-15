/**
 * Invoice Paid Handler - AGPL-3.0 Licensed
 *
 * Handler for Stripe invoice.paid webhook events.
 *
 * @module @calcom/features/billing/api/webhook
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";

import type { LazyModule, SWHMap } from "./__handler";
import process from "node:process";

type Data = SWHMap["invoice.paid"]["data"];

type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;

// We can't crash here if STRIPE_ORG_PRODUCT_ID is not set, because not all self-hosters use Organizations
const STRIPE_ORG_PRODUCT_ID = process.env.STRIPE_ORG_PRODUCT_ID || "";

const log = logger.getSubLogger({ prefix: ["stripe-webhook-invoice-paid"] });

/**
 * Route invoice paid to appropriate product handler.
 */
const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const invoice = data.object;
  // Only handle subscription invoices
  if (!invoice.subscription) {
    log.warn("Not a subscription invoice, skipping");
    return { success: false, message: "Not a subscription invoice, skipping" };
  }

  // Get the product ID from the first subscription item
  const firstItem = invoice.lines.data[0];
  const productId = firstItem?.price?.product as string;

  if (!productId) {
    log.warn("No product ID found in invoice, skipping");
    return { success: false, message: "No product ID found in invoice, skipping" };
  }

  const handlerGetter = handlers[productId as keyof typeof handlers];

  if (!handlerGetter) {
    log.warn(`Skipping product: ${productId} because no handler found`);
    return { success: false, message: `Skipping product: ${productId} because no handler found` };
  }

  const handler = (await handlerGetter())?.default;
  if (!handler) {
    log.warn(`Skipping product: ${productId} because no handler found`);
    return { success: false, message: `Skipping product: ${productId} because no handler found` };
  }

  return await handler(data);
};

export default stripeWebhookProductHandler({
  [STRIPE_ORG_PRODUCT_ID]: () => import("./_invoice.paid.org"),
});
