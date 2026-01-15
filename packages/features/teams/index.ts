/**
 * Teams Module - AGPL-3.0 Licensed
 *
 * Public exports for the teams module.
 *
 * @module @calcom/features/teams
 * @license AGPL-3.0
 */

// Lib exports
export { deleteWorkfowRemindersOfRemovedMember } from "./lib/deleteWorkflowRemindersOfRemovedMember";
export { getParsedTeam } from "./lib/getParsedTeam";
export { getTeamData } from "./lib/getTeamData";
export type { TeamData } from "./lib/getTeamData";
export { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "./lib/getTeamMemberEmailFromCrm";
export * from "./lib/payments";
export {
  getTeamWithMembers,
  getTeamWithoutMembers,
  isTeamOwner,
  isTeamMember,
  generateNewChildEventTypeDataForDB,
  updateNewTeamMemberEventTypes,
  addNewMembersToEventTypes,
} from "./lib/queries";
export type { TeamWithMembers } from "./lib/queries";
export type { NewTeamFormValues, PendingMember } from "./lib/types";

// Repository exports
export { TeamRepository, getTeam, getOrg } from "./repositories/TeamRepository";

// Service exports
export { TeamService } from "./services/teamService";
export type { RemoveMemberResult } from "./services/teamService";
