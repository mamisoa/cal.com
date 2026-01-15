/**
 * Team Billing Data Repository Factory Module - AGPL-3.0 Licensed
 *
 * DI module for the team billing data repository.
 *
 * @module @calcom/features/billing/di/modules
 * @license AGPL-3.0
 */

import { type Container, createModule, type ModuleLoader, type ResolveFunction } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import type { PrismaClient } from "@calcom/prisma";

import { PrismaTeamBillingDataRepository } from "../../repository/teamBillingData/PrismaTeamBillingDataRepository";
import { StubTeamBillingDataRepository } from "../../repository/teamBillingData/StubTeamBillingDataRepository";
import { DI_TOKENS } from "../tokens";
import { isTeamBillingEnabledModuleLoader } from "./IsTeamBillingEnabled";

const teamBillingDataRepositoryFactoryModule = createModule();
const token = DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY;

teamBillingDataRepositoryFactoryModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const isTeamBillingEnabled = resolve(DI_TOKENS.IS_TEAM_BILLING_ENABLED);

  if (!isTeamBillingEnabled) {
    return new StubTeamBillingDataRepository();
  }

  const prisma = resolve(GLOBAL_DI_TOKENS.PRISMA_CLIENT) as PrismaClient;
  return new PrismaTeamBillingDataRepository(prisma);
});

export const teamBillingDataRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load dependencies first
    prismaModuleLoader.loadModule(container);
    isTeamBillingEnabledModuleLoader.loadModule(container);

    // Then load this module
    container.load(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY_MODULE, teamBillingDataRepositoryFactoryModule);
  },
};
