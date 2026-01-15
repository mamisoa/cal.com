/**
 * Prisma Team Billing Repository - AGPL-3.0 Licensed
 *
 * Repository for team billing records using Prisma.
 *
 * @module @calcom/features/billing/repository/billing
 * @license AGPL-3.0
 */

import type { PrismaClient } from "@calcom/prisma";

import type {
  Plan,
  SubscriptionStatus,
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  BillingRecord,
} from "../../types";

/**
 * Prisma implementation of billing repository for teams.
 */
export class PrismaTeamBillingRepository implements IBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    const billingRecord = await this.prismaClient.teamBilling.create({
      data: {
        ...args,
      },
    });

    return {
      ...billingRecord,
      planName: billingRecord.planName as Plan,
      status: billingRecord.status as SubscriptionStatus,
    };
  }
}
