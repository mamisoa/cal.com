/**
 * Credit Service Stub - AGPL-3.0 Licensed
 *
 * Stub implementation of CreditService for deployments without SMS/AI Phone credits.
 * All credit checks return positive values, and charge operations are no-ops.
 *
 * @module @calcom/features/billing/stubs
 * @license AGPL-3.0
 */

import logger from "@calcom/lib/logger";
import type { CreditUsageType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["CreditServiceStub"] });

/**
 * Type for the credit check function
 */
export type CreditCheckFn = CreditServiceStub["hasAvailableCredits"];

/**
 * Stub implementation of CreditService.
 * All methods return positive values or no-op for deployments without SMS/AI credits.
 */
export class CreditServiceStub {
  /**
   * Charge credits - no-op in stub implementation
   */
  async chargeCredits({
    userId,
    teamId,
  }: {
    userId?: number;
    teamId?: number;
    credits: number | null;
    bookingUid?: string;
    smsSid?: string;
    smsSegments?: number;
    phoneNumber?: string;
    email?: string;
    callDuration?: number;
    creditFor?: CreditUsageType;
    externalRef?: string;
  }) {
    log.debug("chargeCredits called (no-op in stub mode)", { userId, teamId });
    return {
      teamId: teamId ?? null,
      userId: userId ?? null,
    };
  }

  /**
   * Check if credits are available - always returns true in stub
   */
  async hasAvailableCredits({
    userId,
    teamId,
  }: {
    userId?: number | null;
    teamId?: number | null;
  }): Promise<boolean> {
    log.debug("hasAvailableCredits called (always true in stub mode)", { userId, teamId });
    return true;
  }

  /**
   * Get team with available credits - returns null in stub
   */
  async getTeamWithAvailableCredits(_userId: number) {
    return null;
  }

  /**
   * Get user or team to charge - returns provided IDs
   */
  async getUserOrTeamToCharge({
    userId,
    teamId,
  }: {
    credits: number;
    userId?: number | null;
    teamId?: number | null;
  }) {
    return {
      teamId: teamId ?? undefined,
      userId: userId ?? undefined,
      remainingCredits: Infinity,
      creditType: "ADDITIONAL" as const,
    };
  }

  /**
   * Handle low credit balance - no-op in stub
   */
  async handleLowCreditBalance(_args: {
    teamId?: number | null;
    userId?: number | null;
    remainingCredits: number;
  }) {
    // No-op in stub
  }

  /**
   * Get monthly credits - returns Infinity in stub
   */
  async getMonthlyCredits(_teamId: number): Promise<number> {
    return Infinity;
  }

  /**
   * Calculate credits from price - returns null in stub
   */
  calculateCreditsFromPrice(_price: number): number | null {
    return null;
  }

  /**
   * Get all credits - returns unlimited credits in stub
   */
  async getAllCredits(_args: { userId?: number | null; teamId?: number | null }) {
    return {
      totalMonthlyCredits: Infinity,
      totalRemainingMonthlyCredits: Infinity,
      additionalCredits: Infinity,
      totalCreditsUsedThisMonth: 0,
    };
  }

  /**
   * Get all credits for team - returns unlimited credits in stub
   */
  async getAllCreditsForTeam(_teamId: number) {
    return {
      totalMonthlyCredits: Infinity,
      totalRemainingMonthlyCredits: Infinity,
      additionalCredits: Infinity,
      totalCreditsUsedThisMonth: 0,
    };
  }

  /**
   * Move credits from team to org - no-op in stub
   */
  async moveCreditsFromTeamToOrg(_args: { teamId: number; orgId: number }) {
    return {
      creditsTransferred: 0,
      teamId: _args.teamId,
      orgId: _args.orgId,
    };
  }
}

/**
 * Singleton instance of the stub credit service
 */
export const creditServiceStub = new CreditServiceStub();
