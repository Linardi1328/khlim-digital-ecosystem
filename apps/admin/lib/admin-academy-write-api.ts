"use client";

import { adminApiClient } from "./admin-api";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import type { OfferingStatus } from "./types";

export interface AdminWriteOutcome {
  persisted: boolean;
  demo: boolean;
}

export async function updateOfferingStatus(
  offeringId: string,
  status: OfferingStatus,
): Promise<AdminWriteOutcome> {
  if (ADMIN_DEMO_MODE) {
    return { persisted: false, demo: true };
  }

  await adminApiClient.patch(
    `/admin/academy/offerings/${encodeURIComponent(offeringId)}/status`,
    { status },
  );
  return { persisted: true, demo: false };
}

export async function updateMembershipPlanActive(
  planId: string,
  active: boolean,
): Promise<AdminWriteOutcome> {
  if (ADMIN_DEMO_MODE) {
    return { persisted: false, demo: true };
  }

  await adminApiClient.patch(
    `/admin/academy/membership-plans/${encodeURIComponent(planId)}/active`,
    { active },
  );
  return { persisted: true, demo: false };
}
