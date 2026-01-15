/**
 * Get All Workflows From Event Type - AGPL-3.0 Licensed
 *
 * Helper to get all workflows that apply to an event type.
 */

import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import type { Prisma } from "@calcom/prisma/client";

import { WorkflowRepository } from "../repositories/WorkflowRepository";
import type { Workflow } from "./types";
import { isSupportedTrigger, SUPPORTED_ACTIONS } from "./types";

/**
 * Get all workflows from an event type, including team/org workflows
 */
export async function getAllWorkflowsFromEventType(
  eventType: {
    id?: number;
    workflows?: {
      workflow: Workflow;
    }[];
    teamId?: number | null;
    parentId?: number | null;
    parent?: {
      id?: number | null;
      teamId: number | null;
    } | null;
    metadata?: Prisma.JsonValue;
  } | null,
  userId?: number | null
): Promise<Workflow[]> {
  if (!eventType) return [];

  // Get workflows directly attached to the event type
  const eventTypeWorkflows = eventType?.workflows?.map((workflowRel) => workflowRel.workflow) ?? [];

  // Filter to supported triggers and actions
  const filteredEventTypeWorkflows = eventTypeWorkflows
    .filter((workflow) => isSupportedTrigger(workflow.trigger))
    .map((workflow) => ({
      ...workflow,
      steps: workflow.steps.filter((step) =>
        SUPPORTED_ACTIONS.includes(step.action as (typeof SUPPORTED_ACTIONS)[number])
      ),
    }));

  // Get team ID for the event type
  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: eventType?.teamId ?? null },
      parentId: eventType?.parentId || eventType?.parent?.id || null,
    },
  });

  // If we have an event type ID, also get workflows that are "active on all"
  if (eventType.id !== undefined) {
    try {
      const additionalWorkflows = await WorkflowRepository.findAllWorkflowsForEventType({
        eventTypeId: eventType.id,
        userId: userId ?? null,
        teamId: teamId ?? null,
      });

      // Merge and deduplicate
      const allWorkflows = [...filteredEventTypeWorkflows];
      for (const workflow of additionalWorkflows) {
        if (!allWorkflows.find((w) => w.id === workflow.id)) {
          if (isSupportedTrigger(workflow.trigger)) {
            allWorkflows.push({
              ...workflow,
              steps: workflow.steps.filter((step) =>
                SUPPORTED_ACTIONS.includes(step.action as (typeof SUPPORTED_ACTIONS)[number])
              ),
            });
          }
        }
      }

      return allWorkflows;
    } catch {
      // Fall back to just the event type workflows
      return filteredEventTypeWorkflows;
    }
  }

  return filteredEventTypeWorkflows;
}
