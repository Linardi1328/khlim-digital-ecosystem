import { adminApiClient } from "./admin-api";
import { ADMIN_DEMO_MODE } from "./demo-mode";

export type AttendanceMark = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceView = AttendanceMark | "UNMARKED";

export interface OfferingRoster {
  offeringId: string;
  offeringName: string;
  capacity: number;
  truncated: boolean;
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

export function getOfferingRoster(offeringId: string): Promise<OfferingRoster> {
  requireLiveStaffMode();
  return adminApiClient.get<OfferingRoster>(
    `/admin/operations-data/offerings/${encodeURIComponent(offeringId)}/roster`,
  );
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
