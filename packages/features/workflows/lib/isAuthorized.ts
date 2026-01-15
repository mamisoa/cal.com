/**
 * Authorization Check - AGPL-3.0 Licensed
 *
 * Check if a user is authorized to access/modify a workflow.
 */

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export interface AuthorizationParams {
  odId: number;
  odType: "userId" | "teamId";
  currentUserId: number;
  readOnly?: boolean;
}

/**
 * Check if a user is authorized to access a workflow
 */
export async function isAuthorized(params: AuthorizationParams): Promise<{
  authorized: boolean;
  readOnly?: boolean;
}> {
  const { odId, odType, currentUserId, readOnly } = params;

  // If it's the user's own workflow
  if (odType === "userId" && odId === currentUserId) {
    return { authorized: true, readOnly: false };
  }

  // If it's a team workflow, check team membership
  if (odType === "teamId") {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: currentUserId,
          teamId: odId,
        },
      },
      select: {
        role: true,
        accepted: true,
      },
    });

    if (!membership || !membership.accepted) {
      return { authorized: false };
    }

    // Admins and owners can edit, members can only read
    const canEdit = membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER;

    return {
      authorized: true,
      readOnly: readOnly !== undefined ? readOnly : !canEdit,
    };
  }

  // Check if user owns this workflow directly
  if (odType === "userId") {
    // Check if user is in the same org and has access
    const workflow = await prisma.workflow.findFirst({
      where: {
        userId: odId,
      },
      select: {
        user: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (workflow?.user?.organizationId) {
      const userMembership = await prisma.membership.findFirst({
        where: {
          userId: currentUserId,
          teamId: workflow.user.organizationId,
          role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        },
      });

      if (userMembership) {
        return { authorized: true, readOnly: true };
      }
    }
  }

  return { authorized: false };
}
