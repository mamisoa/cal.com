/**
 * Is Team Billing Enabled Module - AGPL-3.0 Licensed
 *
 * DI module for checking if team billing is enabled.
 *
 * @module @calcom/features/billing/di/modules
 * @license AGPL-3.0
 */

import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { DI_TOKENS } from "../tokens";

const isTeamBillingEnabledModule = createModule();
const token = DI_TOKENS.IS_TEAM_BILLING_ENABLED;

isTeamBillingEnabledModule.bind(token).toFactory(() => {
  return IS_TEAM_BILLING_ENABLED;
});

export const isTeamBillingEnabledModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(token, isTeamBillingEnabledModule);
  },
};
