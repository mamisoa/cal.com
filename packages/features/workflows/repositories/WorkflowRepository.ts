/**
 * WorkflowRepository - AGPL-3.0 Licensed
 *
 * Database access layer for workflow operations.
 */

import { prisma } from "@calcom/prisma";
import type { TimeUnit, WorkflowTriggerEvents } from "@calcom/prisma/enums";

import type { Workflow, WorkflowStep } from "../lib/types";
import { SUPPORTED_ACTIONS } from "../lib/types";

/**
 * Repository for workflow database operations
 */
export class WorkflowRepository {
  /**
   * Find all workflows for a user
   */
  static async findByUserId(userId: number): Promise<Workflow[]> {
    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
      },
      include: {
        steps: true,
      },
      orderBy: {
        position: "asc",
      },
    });

    return workflows.map(WorkflowRepository.mapToWorkflow);
  }

  /**
   * Find all workflows for a team
   */
  static async findByTeamId(teamId: number): Promise<Workflow[]> {
    const workflows = await prisma.workflow.findMany({
      where: {
        teamId,
      },
      include: {
        steps: true,
      },
      orderBy: {
        position: "asc",
      },
    });

    return workflows.map(WorkflowRepository.mapToWorkflow);
  }

  /**
   * Find a workflow by ID
   */
  static async findById(workflowId: number): Promise<Workflow | null> {
    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },
      include: {
        steps: true,
      },
    });

    if (!workflow) return null;
    return WorkflowRepository.mapToWorkflow(workflow);
  }

  /**
   * Find all workflows active on an event type
   */
  static async findActiveOnEventType(eventTypeId: number): Promise<Workflow[]> {
    const workflowsOnEventType = await prisma.workflowsOnEventTypes.findMany({
      where: {
        eventTypeId,
      },
      include: {
        workflow: {
          include: {
            steps: true,
          },
        },
      },
    });

    return workflowsOnEventType.map((woe) => WorkflowRepository.mapToWorkflow(woe.workflow));
  }

  /**
   * Find all workflows for an event type including team/user workflows that apply
   */
  static async findAllWorkflowsForEventType(params: {
    eventTypeId: number;
    userId: number | null;
    teamId: number | null;
  }): Promise<Workflow[]> {
    const { eventTypeId, userId, teamId } = params;

    // Get workflows directly linked to this event type
    const linkedWorkflows = await WorkflowRepository.findActiveOnEventType(eventTypeId);

    // Get workflows that are active on all event types for this user/team
    const activeOnAllWorkflows = await prisma.workflow.findMany({
      where: {
        isActiveOnAll: true,
        OR: [userId ? { userId } : {}, teamId ? { teamId } : {}].filter(
          (condition) => Object.keys(condition).length > 0
        ),
      },
      include: {
        steps: true,
      },
    });

    const allWorkflows = [...linkedWorkflows, ...activeOnAllWorkflows.map(WorkflowRepository.mapToWorkflow)];

    // Deduplicate by ID
    const uniqueWorkflows = allWorkflows.reduce<Workflow[]>((acc, workflow) => {
      if (!acc.find((w) => w.id === workflow.id)) {
        acc.push(workflow);
      }
      return acc;
    }, []);

    // Filter to only supported actions
    return uniqueWorkflows.map((workflow) => ({
      ...workflow,
      steps: workflow.steps.filter((step) =>
        SUPPORTED_ACTIONS.includes(step.action as (typeof SUPPORTED_ACTIONS)[number])
      ),
    }));
  }

  /**
   * Create a new workflow
   */
  static async create(data: {
    name: string;
    trigger: WorkflowTriggerEvents;
    time?: number;
    timeUnit?: TimeUnit;
    userId?: number;
    teamId?: number;
  }): Promise<Workflow> {
    const workflow = await prisma.workflow.create({
      data: {
        name: data.name,
        trigger: data.trigger,
        time: data.time ?? null,
        timeUnit: data.timeUnit ?? null,
        userId: data.userId ?? null,
        teamId: data.teamId ?? null,
      },
      include: {
        steps: true,
      },
    });

    return WorkflowRepository.mapToWorkflow(workflow);
  }

  /**
   * Update a workflow
   */
  static async update(
    workflowId: number,
    data: Partial<{
      name: string;
      trigger: WorkflowTriggerEvents;
      time: number | null;
      timeUnit: TimeUnit | null;
    }>
  ): Promise<Workflow> {
    const workflow = await prisma.workflow.update({
      where: {
        id: workflowId,
      },
      data,
      include: {
        steps: true,
      },
    });

    return WorkflowRepository.mapToWorkflow(workflow);
  }

  /**
   * Delete a workflow
   */
  static async delete(workflowId: number): Promise<void> {
    await prisma.workflow.delete({
      where: {
        id: workflowId,
      },
    });
  }

  /**
   * Add a step to a workflow
   */
  static async addStep(
    workflowId: number,
    step: Omit<WorkflowStep, "id"> & { stepNumber?: number }
  ): Promise<WorkflowStep> {
    // Get current step count to determine stepNumber
    const existingSteps = await prisma.workflowStep.count({
      where: { workflowId },
    });
    const stepNumber = step.stepNumber ?? existingSteps + 1;

    const createdStep = await prisma.workflowStep.create({
      data: {
        workflowId,
        stepNumber,
        action: step.action,
        sendTo: step.sendTo,
        template: step.template,
        reminderBody: step.reminderBody,
        emailSubject: step.emailSubject,
        sender: step.sender,
        includeCalendarEvent: step.includeCalendarEvent,
        numberVerificationPending: step.numberVerificationPending,
        numberRequired: step.numberRequired,
      },
    });

    return WorkflowRepository.mapToWorkflowStep(createdStep);
  }

  /**
   * Link a workflow to an event type
   */
  static async linkToEventType(workflowId: number, eventTypeId: number): Promise<void> {
    await prisma.workflowsOnEventTypes.upsert({
      where: {
        workflowId_eventTypeId: {
          workflowId,
          eventTypeId,
        },
      },
      create: {
        workflowId,
        eventTypeId,
      },
      update: {},
    });
  }

  /**
   * Unlink a workflow from an event type
   */
  static async unlinkFromEventType(workflowId: number, eventTypeId: number): Promise<void> {
    await prisma.workflowsOnEventTypes.delete({
      where: {
        workflowId_eventTypeId: {
          workflowId,
          eventTypeId,
        },
      },
    });
  }

  /**
   * Delete all workflow reminders for given IDs or reminder objects
   */
  static async deleteAllWorkflowReminders(reminders: number[] | Array<{ id: number }>): Promise<void> {
    if (reminders.length === 0) return;

    // Extract IDs if array contains objects
    const ids = reminders.map((r) => (typeof r === "number" ? r : r.id));

    await prisma.workflowReminder.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  /**
   * Map Prisma workflow to domain type
   */
  private static mapToWorkflow(prismaWorkflow: {
    id: number;
    name: string;
    trigger: WorkflowTriggerEvents;
    time: number | null;
    timeUnit: string | null;
    userId: number | null;
    teamId: number | null;
    steps: Array<{
      id: number;
      stepNumber?: number;
      action: string;
      sendTo: string | null;
      template: string;
      reminderBody: string | null;
      emailSubject: string | null;
      sender: string | null;
      includeCalendarEvent: boolean;
      numberVerificationPending: boolean;
      numberRequired: boolean | null;
      verifiedAt?: Date | null;
    }>;
  }): Workflow {
    return {
      id: prismaWorkflow.id,
      name: prismaWorkflow.name,
      trigger: prismaWorkflow.trigger,
      time: prismaWorkflow.time,
      timeUnit: prismaWorkflow.timeUnit as Workflow["timeUnit"],
      userId: prismaWorkflow.userId,
      teamId: prismaWorkflow.teamId,
      steps: prismaWorkflow.steps.map(WorkflowRepository.mapToWorkflowStep),
    };
  }

  /**
   * Map Prisma workflow step to domain type
   */
  private static mapToWorkflowStep(prismaStep: {
    id: number;
    stepNumber?: number;
    action: string;
    sendTo: string | null;
    template: string;
    reminderBody: string | null;
    emailSubject: string | null;
    sender: string | null;
    includeCalendarEvent: boolean;
    numberVerificationPending: boolean;
    numberRequired: boolean | null;
    verifiedAt?: Date | null;
  }): WorkflowStep {
    return {
      id: prismaStep.id,
      action: prismaStep.action as WorkflowStep["action"],
      sendTo: prismaStep.sendTo,
      template: prismaStep.template as WorkflowStep["template"],
      reminderBody: prismaStep.reminderBody,
      emailSubject: prismaStep.emailSubject,
      sender: prismaStep.sender,
      includeCalendarEvent: prismaStep.includeCalendarEvent,
      numberVerificationPending: prismaStep.numberVerificationPending,
      numberRequired: prismaStep.numberRequired,
      verifiedAt: prismaStep.verifiedAt,
    };
  }
}
