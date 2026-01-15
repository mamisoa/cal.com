/**
 * Subscription Deleted Handler - AGPL-3.0 Licensed
 *
 * Handler for Stripe customer.subscription.deleted webhook events.
 * Note: AI Phone functionality has been removed.
 *
 * @module @calcom/features/billing/api/webhook
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";

import type { LazyModule, SWHMap } from "./__handler";
import process from "node:process";

type Data = SWHMap["customer.subscription.deleted"]["data"];

type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;

const STRIPE_TEAM_PRODUCT_ID = process.env.STRIPE_TEAM_PRODUCT_ID || "";

const log = logger.getSubLogger({ prefix: ["customer.subscription.deleted"] });

/**
 * Route subscription deletion to appropriate product handler.
 */
const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const subscription = data.object;

  // Get product ID from subscription
  let productId: string | null = null;
  // @ts-expect-error - support legacy just in case.
  if (subscription.plan) {
    // @ts-expect-error - we know subscription.plan.product is defined when unsubscribing
    productId = subscription.plan.product;
  } else {
    const subscriptionItem = subscription.items?.data?.[0];
    if (!subscriptionItem) {
      log.error("Subscription item and plan missing");
      throw new Error("Subscription item and plan missing");
    }
    const product = subscription.items.data[0]?.plan.product;
    if (product) {
      productId = typeof product === "string" ? product : product.id;
    }
  }

  if (typeof productId !== "string") {
    log.error(`Unable to determine Product ID from subscription: ${subscription.id}`);
    throw new Error(`Unable to determine Product ID from subscription: ${subscription.id}`);
  }

  const handlerGetter = handlers[productId as keyof typeof handlers];
  if (!handlerGetter) {
    log.info("No product handler found for product", { productId });
    return {
      success: false,
      message: `No product handler found for product: ${productId}`,
    };
  }

  const handler = (await handlerGetter())?.default;
  if (!handler) {
    log.info("No product handler found for product", { productId });
    return {
      success: false,
      message: `No product handler found for product: ${productId}`,
    };
  }

  return await handler(data);
};

export default stripeWebhookProductHandler({
  [STRIPE_TEAM_PRODUCT_ID]: () => import("./_customer.subscription.deleted.team-plan"),
});
