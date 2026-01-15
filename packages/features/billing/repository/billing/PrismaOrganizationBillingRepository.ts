/**
 * Prisma Organization Billing Repository - AGPL-3.0 Licensed
 *
 * Repository for organization billing records using Prisma.
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
 * Prisma implementation of billing repository for organizations.
 */
export class PrismaOrganizationBillingRepository implements IBillingRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    const billingRecord = await this.prismaClient.organizationBilling.create({
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
