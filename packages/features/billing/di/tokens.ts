/**
 * DI Tokens - AGPL-3.0 Licensed
 *
 * Dependency injection tokens for the billing module.
 *
 * @module @calcom/features/billing/di
 * @license AGPL-3.0
 */

export const DI_TOKENS = {
  STRIPE_CLIENT: Symbol("StripeClient"),
  IS_TEAM_BILLING_ENABLED: Symbol("IsTeamBillingEnabled"),
  BILLING_PROVIDER_SERVICE: Symbol("BillingProviderService"),
  BILLING_PROVIDER_SERVICE_MODULE: Symbol("BillingProviderServiceModule"),
  BILLING_REPOSITORY_FACTORY: Symbol("BillingRepositoryFactory"),
  BILLING_REPOSITORY_FACTORY_MODULE: Symbol("BillingRepositoryFactoryModule"),
  TEAM_BILLING_DATA_REPOSITORY: Symbol("TeamBillingDataRepository"),
  TEAM_BILLING_DATA_REPOSITORY_MODULE: Symbol("TeamBillingDataRepositoryModule"),
  TEAM_BILLING_SERVICE_FACTORY: Symbol("TeamBillingServiceFactory"),
  TEAM_BILLING_SERVICE_FACTORY_MODULE: Symbol("TeamBillingServiceFactoryModule"),
};
