import { ApiError } from "@khlim/api-client";
import { adminApi, adminApiClient } from "./admin-api";
import { ADMIN_DEMO_MODE } from "./demo-mode";

export type AttendanceMark = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceView = AttendanceMark | "UNMARKED";

export interface OfferingRoster {
  offeringId: string;
  offeringName: string;
  capacity: number;
  truncated: boolean;
  source?: "roster-api" | "membership-read-only";
  members: Array<{
    membershipId: string;
    athleteId: string;
    athleteName: string;
    membershipStatus: "ACTIVE" | "PENDING" | "SUSPENDED";
    membershipPlanName: string;
  }>;
}

export interface SessionRoster {
  sessionId: string;
  programmeOfferingId: string | null;
  players: Array<{
    athleteId: string;
    athleteName: string;
    attendanceStatus: AttendanceView;
    markedAt: string | null;
  }>;
}

function requireLiveStaffMode() {
  if (ADMIN_DEMO_MODE) {
    throw new Error(
      "Real athlete rosters are not available in Admin demo mode.",
    );
  }
}

export async function getOfferingRoster(
  offeringId: string,
  offeringName = "Selected offering",
  capacity = 0,
): Promise<OfferingRoster> {
  requireLiveStaffMode();
  try {
    const roster = await adminApiClient.get<OfferingRoster>(
      `/admin/operations-data/offerings/${encodeURIComponent(offeringId)}/roster`,
    );
    return { ...roster, source: "roster-api" };
  } catch (error) {
    // Compatibility for this Preview only: current production API has an
    // authorized organization-scoped memberships read endpoint, but not the
    // new offering-specific read model yet. Never bypass auth/role failures.
    if (!(error instanceof ApiError) || error.status !== 404) throw error;

    const memberships = (await adminApi.listMemberships()).filter(
      (membership) =>
        membership.programmeOfferingId === offeringId &&
        ["ACTIVE", "PENDING", "SUSPENDED"].includes(membership.status),
    );
    return {
      offeringId,
      offeringName,
      capacity,
      source: "membership-read-only",
      members: memberships.slice(0, 200).map((membership) => ({
        membershipId: membership.id,
        athleteId: membership.athleteId,
        athleteName: membership.athleteName,
        membershipStatus: membership.status as
          "ACTIVE" | "PENDING" | "SUSPENDED",
        membershipPlanName: membership.planName,
      })),
      truncated: memberships.length > 200,
    };
  }
}

export function getSessionRoster(sessionId: string): Promise<SessionRoster> {
  requireLiveStaffMode();
  return adminApiClient.get<SessionRoster>(
    `/admin/scheduling/sessions/${encodeURIComponent(sessionId)}/roster`,
  );
}

export function recordSessionAttendance(
  sessionId: string,
  athleteId: string,
  status: AttendanceMark,
): Promise<unknown> {
  requireLiveStaffMode();
  return adminApiClient.put(
    `/admin/scheduling/sessions/${encodeURIComponent(sessionId)}/attendance`,
    { athleteId, status },
  );
}
