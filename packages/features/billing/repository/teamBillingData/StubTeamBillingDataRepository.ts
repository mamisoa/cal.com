/**
 * Stub Team Billing Data Repository - AGPL-3.0 Licensed
 *
 * Stub implementation for when billing is disabled.
 *
 * @module @calcom/features/billing/repository/teamBillingData
 * @license AGPL-3.0
 */

import type { ITeamBillingDataRepository, TeamBillingType } from "./ITeamBillingDataRepository";

/**
 * Stub implementation of team billing data repository.
 * Returns mock data without querying database.
 */
export class StubTeamBillingDataRepository implements ITeamBillingDataRepository {
  async find(teamId: number): Promise<TeamBillingType> {
    return {
      id: teamId,
      metadata: {},
      isOrganization: false,
      parentId: null,
      name: `Team ${teamId}`,
    };
  }

  async findBySubscriptionId(_subscriptionId: string): Promise<TeamBillingType | null> {
    return null;
  }

  async findMany(teamIds: number[]): Promise<TeamBillingType[]> {
    return teamIds.map((id) => ({
      id,
      metadata: {},
      isOrganization: false,
      parentId: null,
      name: `Team ${id}`,
    }));
  }
}
