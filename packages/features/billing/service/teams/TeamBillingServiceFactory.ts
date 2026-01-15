/**
 * Team Billing Service Factory - AGPL-3.0 Licensed
 *
 * Factory for creating team billing service instances.
 *
 * @module @calcom/features/billing/service/teams
 * @license AGPL-3.0
 */

import type {
  IBillingRepository,
  ITeamBillingDataRepository,
  IBillingProviderService,
  ITeamBillingService,
  TeamBillingInput,
  ITeamBillingServiceFactoryDeps,
} from "../../types";
import { StubTeamBillingService } from "./StubTeamBillingService";
import { TeamBillingService } from "./TeamBillingService";

/**
 * Factory for creating team billing service instances.
 * Returns stub implementation when billing is disabled.
 */
export class TeamBillingServiceFactory {
  constructor(private readonly deps: ITeamBillingServiceFactoryDeps) {}

  /**
   * Initialize a single team billing service
   */
  init(team: TeamBillingInput): ITeamBillingService {
    if (!this.deps.isTeamBillingEnabled) {
      return new StubTeamBillingService(team);
    }

    const billingRepository = this.deps.billingRepositoryFactory(team.isOrganization);

    return new TeamBillingService({
      team,
      billingProviderService: this.deps.billingProviderService,
      teamBillingDataRepository: this.deps.teamBillingDataRepository,
      billingRepository,
    });
  }

  /**
   * Initialize multiple team billing services at once
   */
  initMany(teams: TeamBillingInput[]) {
    return teams.map((team) => this.init(team));
  }

  /**
   * Fetch and initialize a single team billing service
   */
  async findAndInit(teamId: number) {
    const team = await this.deps.teamBillingDataRepository.find(teamId);
    return this.init(team);
  }

  /**
   * Fetch and initialize multiple team billing services
   */
  async findAndInitMany(teamIds: number[]) {
    const teams = await this.deps.teamBillingDataRepository.findMany(teamIds);
    return this.initMany(teams);
  }
}
