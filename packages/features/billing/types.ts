/**
 * Billing Types and Interfaces - AGPL-3.0 Licensed
 *
 * Type definitions for the billing module.
 *
 * @module @calcom/features/billing/types
 * @license AGPL-3.0
 */

import type { Team } from "@calcom/prisma/client";
import type Stripe from "stripe";

// ============================================================================
// Enums
// ============================================================================

/**
 * Billing plan types
 */
export enum Plan {
  TEAM = "TEAM",
  ORGANIZATION = "ORGANIZATION",
  ENTERPRISE = "ENTERPRISE",
}

/**
 * Subscription status values matching Stripe statuses
 */
export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  PAST_DUE = "PAST_DUE",
  TRIALING = "TRIALING",
  INCOMPLETE = "INCOMPLETE",
  INCOMPLETE_EXPIRED = "INCOMPLETE_EXPIRED",
  UNPAID = "UNPAID",
  PAUSED = "PAUSED",
}

// ============================================================================
// Billing Repository Interfaces
// ============================================================================

/**
 * Billing record stored in the database
 */
export interface BillingRecord {
  id: string;
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
}

/**
 * Arguments for creating a billing record
 */
export interface IBillingRepositoryCreateArgs {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  planName: Plan;
  status: SubscriptionStatus;
  subscriptionStart?: Date;
  subscriptionTrialEnd?: Date;
  subscriptionEnd?: Date;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
  pricePerSeat?: number;
  paidSeats?: number;
}

/**
 * Constructor arguments for billing repository
 */
export interface IBillingRepositoryConstructorArgs {
  teamId: number;
  isOrganization: boolean;
}

/**
 * Billing repository interface
 */
export interface IBillingRepository {
  create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord>;
}

// ============================================================================
// Team Billing Interfaces
// ============================================================================

/**
 * Input data for team billing operations
 */
export type TeamBillingInput = Pick<Team, "id" | "parentId" | "metadata" | "isOrganization">;

/**
 * Response status for team billing publish operation
 */
export const TeamBillingPublishResponseStatus = {
  REQUIRES_PAYMENT: "REQUIRES_PAYMENT",
  REQUIRES_UPGRADE: "REQUIRES_UPGRADE",
  SUCCESS: "SUCCESS",
} as const;

/**
 * Response from team billing publish operation
 */
export interface TeamBillingPublishResponse {
  redirectUrl: string | null;
  status: (typeof TeamBillingPublishResponseStatus)[keyof typeof TeamBillingPublishResponseStatus];
}

/**
 * Team billing service interface
 */
export interface ITeamBillingService {
  cancel(): Promise<void>;
  publish(): Promise<TeamBillingPublishResponse>;
  downgrade(): Promise<void>;
  updateQuantity(): Promise<void>;
  getSubscriptionStatus(): Promise<SubscriptionStatus | null>;
  endTrial(): Promise<boolean>;
  saveTeamBilling(args: IBillingRepositoryCreateArgs): Promise<void>;
}

// ============================================================================
// Team Billing Data Repository Interface
// ============================================================================

/**
 * Repository for fetching team billing data
 */
export interface ITeamBillingDataRepository {
  find(teamId: number): Promise<TeamBillingInput>;
  findMany(teamIds: number[]): Promise<TeamBillingInput[]>;
}

// ============================================================================
// Billing Provider Service Interface
// ============================================================================

/**
 * Billing provider service interface (Stripe implementation)
 */
export interface IBillingProviderService {
  checkoutSessionIsPaid(paymentId: string): Promise<boolean>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionUpdate(args: {
    subscriptionId: string;
    subscriptionItemId: string;
    membershipCount: number;
  }): Promise<void>;
  handleEndTrial(subscriptionId: string): Promise<void>;

  // Customer management
  createCustomer(args: {
    email: string;
    metadata?: Record<string, string>;
  }): Promise<{ stripeCustomerId: string }>;
  createPaymentIntent(args: {
    customerId: string;
    amount: number;
    metadata?: Record<string, string | number>;
  }): Promise<{ id: string; client_secret: string | null }>;

  // Subscription management
  createSubscriptionCheckout(args: {
    customerId: string;
    successUrl: string;
    cancelUrl: string;
    priceId: string;
    quantity: number;
    metadata?: Record<string, string | number>;
    mode?: "subscription" | "setup" | "payment";
    allowPromotionCodes?: boolean;
    customerUpdate?: {
      address?: "auto" | "never";
    };
    automaticTax?: {
      enabled: boolean;
    };
    discounts?: Array<{
      coupon: string;
    }>;
    subscriptionData?: {
      metadata?: Record<string, string | number>;
      trial_period_days?: number;
    };
  }): Promise<{ checkoutUrl: string | null; sessionId: string }>;

  // One-time checkout (for credits, etc.)
  createOneTimeCheckout?(args: {
    priceId: string;
    quantity: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    allowPromotionCodes?: boolean;
  }): Promise<{ checkoutUrl: string | null; sessionId: string }>;

  // Price management
  createPrice(args: {
    amount: number;
    currency: string;
    interval: "month" | "year";
    nickname?: string;
    productId: string;
    metadata?: Record<string, string | number>;
  }): Promise<{ priceId: string }>;
  getPrice(priceId: string): Promise<Stripe.Price | null>;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus | null>;

  getCheckoutSession(checkoutSessionId: string): Promise<Stripe.Checkout.Session | null>;
  getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer | null>;
  getSubscriptions(customerId: string): Promise<Stripe.Subscription[] | null>;
  updateCustomer(args: { customerId: string; email: string; userId?: number }): Promise<void>;

  // Invoice management
  createInvoiceItem(args: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<{ invoiceItemId: string }>;

  createInvoice(args: {
    customerId: string;
    autoAdvance: boolean;
    metadata?: Record<string, string>;
  }): Promise<{ invoiceId: string }>;

  finalizeInvoice(invoiceId: string): Promise<void>;

  // Subscription queries
  getSubscription(subscriptionId: string): Promise<{
    items: Array<{
      id: string;
      quantity: number;
      price: {
        unit_amount: number | null;
        recurring: {
          interval: string;
        } | null;
      };
    }>;
    customer: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    trial_end: number | null;
  } | null>;
}

// ============================================================================
// Team Billing Service Factory Interface
// ============================================================================

/**
 * Dependencies for TeamBillingServiceFactory
 */
export interface ITeamBillingServiceFactoryDeps {
  billingProviderService: IBillingProviderService;
  teamBillingDataRepository: ITeamBillingDataRepository;
  billingRepositoryFactory: (isOrganization: boolean) => IBillingRepository;
  isTeamBillingEnabled: boolean;
}

/**
 * Factory for creating team billing service instances
 */
export interface ITeamBillingServiceFactory {
  init(team: TeamBillingInput): ITeamBillingService;
  initMany(teams: TeamBillingInput[]): ITeamBillingService[];
  findAndInit(teamId: number): Promise<ITeamBillingService>;
  findAndInitMany(teamIds: number[]): Promise<ITeamBillingService[]>;
}
