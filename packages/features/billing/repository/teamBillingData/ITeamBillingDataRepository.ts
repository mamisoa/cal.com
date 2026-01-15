/**
 * Team Billing Data Repository Interface - AGPL-3.0 Licensed
 *
 * Interface and types for team billing data repository.
 *
 * @module @calcom/features/billing/repository/teamBillingData
 * @license AGPL-3.0
 */

import type { Prisma } from "@calcom/prisma/client";

/**
 * Prisma select for team billing data
 */
export const teamBillingSelect = {
  id: true,
  metadata: true,
  isOrganization: true,
  parentId: true,
  name: true,
} satisfies Prisma.TeamSelect;

/**
 * Type for team billing data from Prisma
 */
export type TeamBillingType = Prisma.TeamGetPayload<{
  select: typeof teamBillingSelect;
}>;

/**
 * Repository interface for team billing data
 */
export interface ITeamBillingDataRepository {
  find(teamId: number): Promise<TeamBillingType>;
  findBySubscriptionId(subscriptionId: string): Promise<TeamBillingType | null>;
  findMany(teamIds: number[]): Promise<TeamBillingType[]>;
}
