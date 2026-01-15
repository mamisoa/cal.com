/**
 * getTeamData - AGPL-3.0 Licensed
 *
 * Utility to fetch team data from database.
 *
 * @module @calcom/features/teams/lib/getTeamData
 * @license AGPL-3.0
 */

import { getSlugOrRequestedSlug } from "@calcom/lib/orgDomains";
import { prisma } from "@calcom/prisma";

export type TeamData = Awaited<ReturnType<typeof getTeamData>>;

export async function getTeamData(teamSlug: string, orgSlug: string | null) {
  return await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: orgSlug ? getSlugOrRequestedSlug(orgSlug) : null,
    },
    orderBy: {
      slug: { sort: "asc", nulls: "last" },
    },
    select: {
      id: true,
      isPrivate: true,
      hideBranding: true,
      parent: {
        select: {
          id: true,
          slug: true,
          name: true,
          bannerUrl: true,
          logoUrl: true,
          hideBranding: true,
          organizationSettings: {
            select: {
              allowSEOIndexing: true,
            },
          },
        },
      },
      logoUrl: true,
      name: true,
      slug: true,
      brandColor: true,
      darkBrandColor: true,
      theme: true,
      isOrganization: true,
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
        },
      },
    },
  });
}
