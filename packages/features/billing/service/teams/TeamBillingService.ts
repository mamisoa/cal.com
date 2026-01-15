/**
 * Team Billing Service - AGPL-3.0 Licensed
 *
 * Service for managing team billing with Stripe.
 *
 * @module @calcom/features/billing/service/teams
 * @license AGPL-3.0
 */

import type { z } from "zod";

import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { purchaseTeamOrOrgSubscription } from "@calcom/features/teams/lib/payments";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getMetadataHelpers } from "@calcom/lib/getMetadataHelpers";
import logger from "@calcom/lib/logger";
import { Redirect } from "@calcom/lib/redirect";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import type {
  IBillingRepository,
  IBillingRepositoryCreateArgs,
  ITeamBillingDataRepository,
  IBillingProviderService,
  ITeamBillingService,
  TeamBillingInput,
} from "../../types";
import { TeamBillingPublishResponseStatus } from "../../types";

const log = logger.getSubLogger({ prefix: ["TeamBillingService"] });

const teamPaymentMetadataSchema = teamMetadataStrictSchema.unwrap();

/**
 * Team billing service implementation with Stripe integration.
 */
export class TeamBillingService implements ITeamBillingService {
  private _team!: Omit<TeamBillingInput, "metadata"> & {
    metadata: NonNullable<z.infer<typeof teamPaymentMetadataSchema>>;
  };
  private billingProviderService: IBillingProviderService;
  private billingRepository: IBillingRepository;
  private teamBillingDataRepository: ITeamBillingDataRepository;

  constructor({
    team,
    billingProviderService,
    teamBillingDataRepository,
    billingRepository,
  }: {
    team: TeamBillingInput;
    billingProviderService: IBillingProviderService;
    teamBillingDataRepository: ITeamBillingDataRepository;
    billingRepository: IBillingRepository;
  }) {
    this.team = team;
    this.billingProviderService = billingProviderService;
    this.teamBillingDataRepository = teamBillingDataRepository;
    this.billingRepository = billingRepository;
  }

  set team(team: TeamBillingInput) {
    const metadata = teamPaymentMetadataSchema.parse(team.metadata || {});
    this._team = { ...team, metadata };
  }

  get team(): typeof this._team {
    return this._team;
  }

  private async getOrgIfNeeded() {
    if (!this.team.parentId) return;
    const parentTeam = await this.teamBillingDataRepository.find(this.team.parentId);
    this.team = parentTeam;
  }

  private logErrorFromUnknown(error: unknown) {
    let message = "Unknown error on TeamBillingService.";
    if (error instanceof Error) message = error.message;
    log.error(message);
  }

  /**
   * Cancel the team's subscription
   */
  async cancel() {
    try {
      const { subscriptionId } = this.team.metadata;
      log.info(`Cancelling subscription ${subscriptionId} for team ${this.team.id}`);
      if (!subscriptionId) throw Error("missing subscriptionId");
      await this.billingProviderService.handleSubscriptionCancel(subscriptionId);
      await this.downgrade();
      log.info(`Cancelled subscription ${subscriptionId} for team ${this.team.id}`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }

  /**
   * Publish/activate team billing - creates checkout session if payment required
   */
  async publish() {
    const { url } = await this.checkIfTeamPaymentRequired();
    const teamId = this.team.id;
    if (url) {
      return { redirectUrl: url, status: TeamBillingPublishResponseStatus.REQUIRES_UPGRADE };
    }
    const requestedSlug = this.team.metadata?.requestedSlug || "";
    const membershipCount = await prisma.membership.count({ where: { teamId } });
    const owner = await prisma.membership.findFirstOrThrow({
      where: { teamId, role: "OWNER" },
      select: {
        userId: true,
      },
    });

    try {
      const checkoutSession = await purchaseTeamOrOrgSubscription({
        teamId,
        seatsUsed: membershipCount,
        userId: owner.userId,
        pricePerSeat: null,
      });

      if (checkoutSession.url) {
        return {
          redirectUrl: checkoutSession.url,
          status: TeamBillingPublishResponseStatus.REQUIRES_PAYMENT,
        };
      }

      const { mergeMetadata } = getMetadataHelpers(teamPaymentMetadataSchema, this.team.metadata);
      const data: Prisma.TeamUpdateInput = {
        metadata: mergeMetadata({ requestedSlug: undefined }),
      };
      if (requestedSlug) data.slug = requestedSlug;
      await prisma.team.update({ where: { id: teamId }, data });
      return { status: TeamBillingPublishResponseStatus.SUCCESS, redirectUrl: null };
    } catch (error) {
      if (error instanceof Redirect) throw error;
      const { message } = getRequestedSlugError(error, requestedSlug);
      throw Error(message);
    }
  }

  /**
   * Downgrade team - remove billing metadata
   */
  async downgrade() {
    try {
      const { mergeMetadata } = getMetadataHelpers(teamPaymentMetadataSchema, this.team.metadata);
      const metadata = mergeMetadata({
        paymentId: undefined,
        subscriptionId: undefined,
        subscriptionItemId: undefined,
      });
      await prisma.team.update({ where: { id: this.team.id }, data: { metadata } });
      log.info(`Downgraded team ${this.team.id}`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }

  /**
   * Update subscription quantity (seats)
   */
  async updateQuantity() {
    try {
      await this.getOrgIfNeeded();
      const { id: teamId, metadata, isOrganization } = this.team;

      const { url } = await this.checkIfTeamPaymentRequired();
      log.debug("updateQuantity", safeStringify({ url, team: this.team }));

      if (!url && !isOrganization) return;

      const { subscriptionId, subscriptionItemId } = metadata;
      const membershipCount = await prisma.membership.count({ where: { teamId } });
      if (!subscriptionId) throw Error("missing subscriptionId");
      if (!subscriptionItemId) throw Error("missing subscriptionItemId");
      await this.billingProviderService.handleSubscriptionUpdate({
        subscriptionId,
        subscriptionItemId,
        membershipCount,
      });
      log.info(`Updated subscription ${subscriptionId} for team ${teamId} to ${membershipCount} seats.`);
    } catch (error) {
      this.logErrorFromUnknown(error);
    }
  }

  /**
   * Check if team payment is required
   */
  async checkIfTeamPaymentRequired() {
    const { paymentId } = this.team.metadata || {};
    if (!paymentId) return { url: null, paymentId: null, paymentRequired: true };
    const checkoutSessionIsPaid = await this.billingProviderService.checkoutSessionIsPaid(paymentId);
    if (!checkoutSessionIsPaid) return { url: null, paymentId, paymentRequired: true };
    return {
      url: `${WEBAPP_URL}/api/teams/${this.team.id}/upgrade?session_id=${paymentId}`,
      paymentId,
      paymentRequired: false,
    };
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus() {
    const { subscriptionId } = this.team.metadata;
    if (!subscriptionId) return null;
    return this.billingProviderService.getSubscriptionStatus(subscriptionId);
  }

  /**
   * End trial period
   */
  async endTrial() {
    try {
      const { subscriptionId } = this.team.metadata;
      log.info(`Ending trial for subscription ${subscriptionId} of team ${this.team.id}`);

      if (!subscriptionId) {
        log.warn(`No subscription ID found for team ${this.team.id}`);
        return false;
      }

      await this.billingProviderService.handleEndTrial(subscriptionId);
      log.info(`Successfully ended trial for team ${this.team.id}`);
      return true;
    } catch (error) {
      this.logErrorFromUnknown(error);
      return false;
    }
  }

  /**
   * Save team billing record
   */
  async saveTeamBilling(args: IBillingRepositoryCreateArgs) {
    await this.billingRepository.create(args);
  }
}
