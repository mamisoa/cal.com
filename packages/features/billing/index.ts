/**
 * Billing Module - AGPL-3.0 Licensed
 *
 * Main entry point for the billing module.
 * Provides Stripe billing integration for teams and organizations.
 *
 * @module @calcom/features/billing
 * @license AGPL-3.0
 */

// Types and Interfaces
export {
  Plan,
  SubscriptionStatus,
  TeamBillingPublishResponseStatus,
  type BillingRecord,
  type IBillingProviderService,
  type IBillingRepository,
  type IBillingRepositoryConstructorArgs,
  type IBillingRepositoryCreateArgs,
  type ITeamBillingDataRepository,
  type ITeamBillingService,
  type ITeamBillingServiceFactory,
  type ITeamBillingServiceFactoryDeps,
  type TeamBillingInput,
  type TeamBillingPublishResponse,
} from "./types";

// Constants
export { CHECKOUT_SESSION_TYPES, type CheckoutSessionType } from "./constants";

// DI Container exports
export {
  getBillingProviderService,
  getTeamBillingDataRepository,
  getTeamBillingServiceFactory,
} from "./di/containers/Billing";

// DI Tokens
export { DI_TOKENS } from "./di/tokens";

// Services
export { StripeBillingService } from "./service/billingProvider/StripeBillingService";
export { TeamBillingService } from "./service/teams/TeamBillingService";
export { TeamBillingServiceFactory } from "./service/teams/TeamBillingServiceFactory";
export { StubTeamBillingService } from "./service/teams/StubTeamBillingService";

// Repositories
export { PrismaTeamBillingRepository } from "./repository/billing/PrismaTeamBillingRepository";
export { PrismaOrganizationBillingRepository } from "./repository/billing/PrismaOrganizationBillingRepository";
export { StubBillingRepository } from "./repository/billing/StubBillingRepository";
export {
  PrismaTeamBillingDataRepository,
} from "./repository/teamBillingData/PrismaTeamBillingDataRepository";
export { StubTeamBillingDataRepository } from "./repository/teamBillingData/StubTeamBillingDataRepository";
export {
  teamBillingSelect,
  type TeamBillingType,
  type ITeamBillingDataRepository as ITeamBillingDataRepositoryInterface,
} from "./repository/teamBillingData/ITeamBillingDataRepository";

// Stubs
export { CreditServiceStub, creditServiceStub, type CreditCheckFn } from "./stubs/CreditServiceStub";
