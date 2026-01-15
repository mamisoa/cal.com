/**
 * Stub Team Billing Service - AGPL-3.0 Licensed
 *
 * Stub implementation for when team billing is disabled.
 *
 * @module @calcom/features/billing/service/teams
 * @license AGPL-3.0
 */

import {
  TeamBillingPublishResponseStatus,
  type ITeamBillingService,
  type TeamBillingInput,
  type TeamBillingPublishResponse,
} from "../../types";

/**
 * Stub implementation of team billing service.
 * Used when team billing is disabled or for self-hosted instances.
 */
export class StubTeamBillingService implements ITeamBillingService {
  constructor(private team: TeamBillingInput) {}

  async cancel(): Promise<void> {
    // Stub implementation - no-op
  }

  async publish(): Promise<TeamBillingPublishResponse> {
    return {
      redirectUrl: null,
      status: TeamBillingPublishResponseStatus.SUCCESS,
    };
  }

  async downgrade(): Promise<void> {
    // Stub implementation - no-op
  }

  async updateQuantity(): Promise<void> {
    // Stub implementation - no-op
  }

  async getSubscriptionStatus() {
    return null;
  }

  async endTrial() {
    return true;
  }

  async saveTeamBilling() {
    // Stub implementation - no-op
  }
}
