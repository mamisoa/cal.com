/**
 * Billing Constants - AGPL-3.0 Licensed
 *
 * Constants used throughout the billing module.
 *
 * @module @calcom/features/billing/constants
 * @license AGPL-3.0
 */

/**
 * Checkout session types for Stripe webhooks
 */
export const CHECKOUT_SESSION_TYPES = {
  PHONE_NUMBER_SUBSCRIPTION: "PHONE_NUMBER_SUBSCRIPTION",
  TEAM_CREATION: "TEAM_CREATION",
  CREDITS_PURCHASE: "CREDITS_PURCHASE",
} as const;

export type CheckoutSessionType = (typeof CHECKOUT_SESSION_TYPES)[keyof typeof CHECKOUT_SESSION_TYPES];
