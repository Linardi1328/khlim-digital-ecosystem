import { isFeatureNotAvailableError } from "@khlim/api-client";
import type {
  AthleteMembershipItem,
  MembershipPlanItem,
  PublicOfferingItem,
} from "./types";

export interface EnrolSubmissionClient {
  createPendingMembership(
    athleteId: string,
    payload: { offeringId: string; planId: string },
  ): Promise<AthleteMembershipItem>;
  listAthleteMemberships(athleteId: string): Promise<AthleteMembershipItem[]>;
  prepareCheckout(
    athleteId: string,
    membershipId: string,
    payload: { acceptTerms: boolean },
  ): Promise<{ checkoutUrl?: string | null }>;
}

export type EnrolCheckoutOutcome =
  | { kind: "deferred" }
  | { kind: "checkout"; checkoutUrl: string }
  | { kind: "confirmation"; confirmationUrl: string };

export async function ensurePendingMembershipRecord(
  client: Pick<
    EnrolSubmissionClient,
    "createPendingMembership" | "listAthleteMemberships"
  >,
  athleteId: string,
  offering: Pick<PublicOfferingItem, "id">,
  plan: Pick<MembershipPlanItem, "id">,
): Promise<AthleteMembershipItem> {
  try {
    return await client.createPendingMembership(athleteId, {
      offeringId: offering.id,
      planId: plan.id,
    });
  } catch (caught) {
    // Never issue an automatic recovery lookup when the server reports a deferred feature gate
    if (isFeatureNotAvailableError(caught)) {
      throw caught;
    }
    try {
      const current = await client.listAthleteMemberships(athleteId);
      const existing = current.find(
        (membership) =>
          membership.programmeOfferingId === offering.id &&
          membership.membershipPlanId === plan.id &&
          membership.status === "PENDING",
      );
      if (existing) return existing;
    } catch (lookupError) {
      if (isFeatureNotAvailableError(lookupError)) {
        throw lookupError;
      }
    }
    throw caught;
  }
}

export async function executeEnrolmentCheckout(
  client: EnrolSubmissionClient,
  athleteId: string,
  offering: Pick<PublicOfferingItem, "id">,
  plan: Pick<MembershipPlanItem, "id">,
): Promise<EnrolCheckoutOutcome> {
  let membership: AthleteMembershipItem;
  try {
    membership = await ensurePendingMembershipRecord(
      client,
      athleteId,
      offering,
      plan,
    );
  } catch (caught) {
    if (isFeatureNotAvailableError(caught)) {
      return { kind: "deferred" };
    }
    throw caught;
  }

  try {
    const checkout = await client.prepareCheckout(athleteId, membership.id, {
      acceptTerms: true,
    });
    if (checkout.checkoutUrl) {
      return { kind: "checkout", checkoutUrl: checkout.checkoutUrl };
    }
  } catch (checkoutError) {
    // Do not swallow a server-authoritative deferred feature gate or redirect into confirmation lookups
    if (isFeatureNotAvailableError(checkoutError)) {
      return { kind: "deferred" };
    }
    // The pending membership remains authoritative even when a payment provider
    // is intentionally unavailable in this environment.
  }

  return {
    kind: "confirmation",
    confirmationUrl: `/enrol/confirmation?athleteId=${encodeURIComponent(athleteId)}&membershipId=${encodeURIComponent(membership.id)}`,
  };
}
