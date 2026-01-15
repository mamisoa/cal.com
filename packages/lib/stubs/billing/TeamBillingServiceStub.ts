/**
 * TeamBillingServiceStub - AGPL-3.0 Licensed
 *
 * Stub implementation of team billing service for self-hosted deployments.
 * All billing operations are no-ops since self-hosted instances don't use
 * Cal.com's billing infrastructure.
 *
 * @module @calcom/lib/stubs/billing
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["TeamBillingServiceStub"] });

/**
 * Stub implementation of team billing service.
 * All methods are no-ops for self-hosted deployments.
 */
export class TeamBillingServiceStub {
  private teamId: number;

  constructor(teamId: number) {
    this.teamId = teamId;
  }

  /**
   * Cancel billing subscription - no-op for self-hosted
   */
  async cancel(): Promise<void> {
    log.debug(`Billing cancel called for team ${this.teamId} (no-op in self-hosted mode)`);
  }

  /**
   * Update subscription quantity - no-op for self-hosted
   */
  async updateQuantity(): Promise<void> {
    log.debug(`Billing updateQuantity called for team ${this.teamId} (no-op in self-hosted mode)`);
  }

  /**
   * Publish/activate team billing - no-op for self-hosted
   * Returns null redirectUrl since no checkout is needed
   */
  async publish(): Promise<{ redirectUrl: string | null; status: "success" | "missing_payment_method" }> {
    log.debug(`Billing publish called for team ${this.teamId} (no-op in self-hosted mode)`);
    return { redirectUrl: null, status: "success" };
  }
}

/**
 * Factory interface matching the EE TeamBillingServiceFactory
 */
export interface TeamBillingServiceFactory {
  findAndInit(teamId: number): Promise<TeamBillingServiceStub>;
  findAndInitMany(teamIds: number[]): Promise<TeamBillingServiceStub[]>;
}

/**
 * Get the team billing service factory stub.
 * Returns a factory that creates TeamBillingServiceStub instances.
 */
export function getTeamBillingServiceFactory(): TeamBillingServiceFactory {
  return {
    /**
     * Find and initialize billing service for a single team
     */
    findAndInit: async (teamId: number): Promise<TeamBillingServiceStub> => {
      return new TeamBillingServiceStub(teamId);
    },

    /**
     * Find and initialize billing services for multiple teams
     */
    findAndInitMany: async (teamIds: number[]): Promise<TeamBillingServiceStub[]> => {
      return teamIds.map((teamId) => new TeamBillingServiceStub(teamId));
    },
  };
}
