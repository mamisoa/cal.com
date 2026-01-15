/**
 * Billing DI Container - AGPL-3.0 Licensed
 *
 * Main DI container for billing services.
 *
 * @module @calcom/features/billing/di/containers
 * @license AGPL-3.0
 */

import { createContainer } from "@calcom/features/di/di";

import type { ITeamBillingDataRepository } from "../../repository/teamBillingData/ITeamBillingDataRepository";
import type { StripeBillingService } from "../../service/billingProvider/StripeBillingService";
import type { TeamBillingServiceFactory } from "../../service/teams/TeamBillingServiceFactory";
import { billingProviderServiceModuleLoader } from "../modules/BillingProviderService";
import { teamBillingServiceFactoryModuleLoader } from "../modules/TeamBillingServiceFactory";
import { DI_TOKENS } from "../tokens";

const billingContainer = createContainer();

// Load all modules (dependencies are loaded recursively)
teamBillingServiceFactoryModuleLoader.loadModule(billingContainer);
billingProviderServiceModuleLoader.loadModule(billingContainer);

/**
 * Get the team billing service factory
 */
export function getTeamBillingServiceFactory(): TeamBillingServiceFactory {
  return billingContainer.get<TeamBillingServiceFactory>(DI_TOKENS.TEAM_BILLING_SERVICE_FACTORY);
}

/**
 * Get the billing provider service (Stripe)
 */
export function getBillingProviderService(): StripeBillingService {
  return billingContainer.get<StripeBillingService>(DI_TOKENS.BILLING_PROVIDER_SERVICE);
}

/**
 * Get the team billing data repository
 */
export function getTeamBillingDataRepository(): ITeamBillingDataRepository {
  return billingContainer.get<ITeamBillingDataRepository>(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY);
}
