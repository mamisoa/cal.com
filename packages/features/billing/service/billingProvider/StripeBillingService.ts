/**
 * Stripe Billing Service - AGPL-3.0 Licensed
 *
 * Implementation of the billing provider service using Stripe.
 *
 * @module @calcom/features/billing/service/billingProvider
 * @license AGPL-3.0
 */

import type Stripe from "stripe";

import logger from "@calcom/lib/logger";

import { SubscriptionStatus, type IBillingProviderService } from "../../types";

const log = logger.getSubLogger({ prefix: ["StripeBillingService"] });

/**
 * Stripe implementation of the billing provider service.
 * Handles all Stripe API interactions for billing operations.
 */
export class StripeBillingService implements IBillingProviderService {
  constructor(private stripe: Stripe) {}

  /**
   * Create a new Stripe customer
   */
  async createCustomer(args: Parameters<IBillingProviderService["createCustomer"]>[0]) {
    const { email, metadata } = args;
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        email,
        ...metadata,
      },
    });
    return { stripeCustomerId: customer.id };
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(args: Parameters<IBillingProviderService["createPaymentIntent"]>[0]) {
    const { customerId, amount, metadata } = args;
    const paymentIntent = await this.stripe.paymentIntents.create({
      customer: customerId,
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    };
  }

  /**
   * Create a one-time checkout session (for credits, etc.)
   */
  async createOneTimeCheckout(args: {
    priceId: string;
    quantity: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    allowPromotionCodes?: boolean;
  }) {
    const { priceId, quantity, successUrl, cancelUrl, metadata, allowPromotionCodes = true } = args;

    const session = await this.stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      allow_promotion_codes: allowPromotionCodes,
      invoice_creation: {
        enabled: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Create a subscription checkout session
   */
  async createSubscriptionCheckout(
    args: Parameters<IBillingProviderService["createSubscriptionCheckout"]>[0]
  ) {
    const {
      customerId,
      successUrl,
      cancelUrl,
      priceId,
      quantity,
      metadata,
      mode = "subscription",
      allowPromotionCodes = true,
      customerUpdate,
      automaticTax,
      discounts,
      subscriptionData,
    } = args;

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode,
      metadata,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      allow_promotion_codes: allowPromotionCodes,
      customer_update: customerUpdate,
      automatic_tax: automaticTax,
      discounts,
      subscription_data: subscriptionData,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Create a new price in Stripe
   */
  async createPrice(args: Parameters<IBillingProviderService["createPrice"]>[0]) {
    const { amount, currency, interval, productId, nickname, metadata } = args;

    const price = await this.stripe.prices.create({
      nickname,
      unit_amount: amount,
      currency,
      recurring: {
        interval,
      },
      product: productId,
      metadata,
    });

    return {
      priceId: price.id,
    };
  }

  /**
   * Handle subscription creation (placeholder)
   */
  async handleSubscriptionCreation(subscriptionId: string) {
    log.info(`Subscription creation handler called for ${subscriptionId}`);
    // Implementation depends on specific business logic
  }

  /**
   * Cancel a subscription
   */
  async handleSubscriptionCancel(subscriptionId: string) {
    await this.stripe.subscriptions.cancel(subscriptionId);
    log.info(`Subscription ${subscriptionId} cancelled`);
  }

  /**
   * Update subscription quantity (seats)
   */
  async handleSubscriptionUpdate(args: Parameters<IBillingProviderService["handleSubscriptionUpdate"]>[0]) {
    const { subscriptionId, subscriptionItemId, membershipCount } = args;
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionQuantity = subscription.items.data.find(
      (sub) => sub.id === subscriptionItemId
    )?.quantity;
    if (!subscriptionQuantity) throw new Error("Subscription not found");
    await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ quantity: membershipCount, id: subscriptionItemId }],
    });
    log.info(`Subscription ${subscriptionId} updated to ${membershipCount} seats`);
  }

  /**
   * End trial period for a subscription
   */
  async handleEndTrial(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status !== "trialing") {
      log.info(`Subscription ${subscriptionId} is not in trial, skipping`);
      return;
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      trial_end: "now",
    });
    log.info(`Trial ended for subscription ${subscriptionId}`);
  }

  /**
   * Check if a checkout session has been paid
   */
  async checkoutSessionIsPaid(paymentId: string) {
    const checkoutSession = await this.stripe.checkout.sessions.retrieve(paymentId);
    return checkoutSession.payment_status === "paid";
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription || !subscription.status) return null;

    return this.mapStripeStatusToCalStatus({
      stripeStatus: subscription.status,
      subscriptionId,
    });
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(checkoutSessionId: string) {
    const checkoutSession = await this.stripe.checkout.sessions.retrieve(checkoutSessionId);
    return checkoutSession;
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string) {
    const customer = await this.stripe.customers.retrieve(customerId);
    return customer;
  }

  /**
   * Get all subscriptions for a customer
   */
  async getSubscriptions(customerId: string) {
    const subscriptions = await this.stripe.subscriptions.list({ customer: customerId });
    return subscriptions.data;
  }

  /**
   * Update customer metadata
   */
  async updateCustomer(args: Parameters<IBillingProviderService["updateCustomer"]>[0]) {
    const { customerId, email, userId } = args;
    const metadata: { email?: string; userId?: number } = {};
    if (email) metadata.email = email;
    if (userId) metadata.userId = userId;
    await this.stripe.customers.update(customerId, { metadata });
  }

  /**
   * Get price details
   */
  async getPrice(priceId: string) {
    const price = await this.stripe.prices.retrieve(priceId);
    return price;
  }

  /**
   * Extract subscription dates from Stripe subscription
   */
  extractSubscriptionDates(subscription: {
    start_date: number;
    trial_end?: number | null;
    cancel_at?: number | null;
  }) {
    // Stripe returns dates as unix time in seconds but Date() expects milliseconds
    const subscriptionStart = new Date(subscription.start_date * 1000);
    const subscriptionTrialEnd = subscription?.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const subscriptionEnd = subscription?.cancel_at ? new Date(subscription.cancel_at * 1000) : null;

    return { subscriptionStart, subscriptionTrialEnd, subscriptionEnd };
  }

  /**
   * Map Stripe subscription status to Cal.com status
   */
  mapStripeStatusToCalStatus({
    stripeStatus,
    subscriptionId,
  }: {
    stripeStatus: string;
    subscriptionId: string;
  }) {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      cancelled: SubscriptionStatus.CANCELLED,
      trialing: SubscriptionStatus.TRIALING,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      unpaid: SubscriptionStatus.UNPAID,
      paused: SubscriptionStatus.PAUSED,
    };

    const status = statusMap[stripeStatus];
    if (!status) {
      log.warn(`Unhandled status for ${stripeStatus} and sub id ${subscriptionId}`);
    }

    return status || SubscriptionStatus.ACTIVE;
  }

  /**
   * Create an invoice item
   */
  async createInvoiceItem(args: Parameters<IBillingProviderService["createInvoiceItem"]>[0]) {
    const { customerId, amount, currency, description, metadata } = args;
    const invoiceItem = await this.stripe.invoiceItems.create({
      customer: customerId,
      amount,
      currency,
      description,
      metadata,
    });

    return { invoiceItemId: invoiceItem.id };
  }

  /**
   * Create an invoice
   */
  async createInvoice(args: Parameters<IBillingProviderService["createInvoice"]>[0]) {
    const { customerId, autoAdvance, metadata } = args;
    const invoice = await this.stripe.invoices.create({
      customer: customerId,
      auto_advance: autoAdvance,
      metadata,
    });

    return { invoiceId: invoice.id };
  }

  /**
   * Finalize an invoice
   */
  async finalizeInvoice(invoiceId: string) {
    await this.stripe.invoices.finalizeInvoice(invoiceId);
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription) return null;

    return {
      items: subscription.items.data.map((item) => ({
        id: item.id,
        quantity: item.quantity || 0,
        price: {
          unit_amount: item.price.unit_amount,
          recurring: item.price.recurring,
        },
      })),
      customer: subscription.customer as string,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      trial_end: subscription.trial_end,
    };
  }
}
