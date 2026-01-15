/**
 * Stub Billing Repository - AGPL-3.0 Licensed
 *
 * Stub implementation for when billing is disabled.
 *
 * @module @calcom/features/billing/repository/billing
 * @license AGPL-3.0
 */

import { randomUUID } from "crypto";

import type {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  BillingRecord,
} from "../../types";

/**
 * Stub implementation of billing repository.
 * Returns mock data without persisting to database.
 */
export class StubBillingRepository implements IBillingRepository {
  async create(args: IBillingRepositoryCreateArgs): Promise<BillingRecord> {
    return {
      id: randomUUID(),
      teamId: args.teamId,
      subscriptionId: args.subscriptionId,
      subscriptionItemId: args.subscriptionItemId,
      customerId: args.customerId,
      planName: args.planName,
      status: args.status,
    };
  }
}
