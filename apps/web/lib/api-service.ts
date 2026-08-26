"use client";

import { createApiClient, type ApiClient } from "@khlim/api-client";
import { getStoredAccessToken } from "./supabase-auth";
import type {
  PublicOfferingItem,
  AccountMeResponse,
  UpsertGuardianProfileDto,
  UpdatePreferencesDto,
  ManagedAthleteLinkItem,
  CreateManagedAthleteDto,
  UpdateAthleteDto,
  AthleteProfileResponse,
  AthleteMembershipItem,
  CreatePendingMembershipDto,
  MembershipBillingResponse,
  PrepareMembershipCheckoutDto,
  CheckoutSessionResponse,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
).replace(/\/+$/, "");

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => getStoredAccessToken(),
});

export const apiService = {
  // Public Academy API
  async getPublicOfferings(): Promise<PublicOfferingItem[]> {
    return apiClient.get<PublicOfferingItem[]>("/v1/academy/offerings", {
      authenticated: false,
    });
  },

  // Account / Identity APIs
  async getMe(): Promise<AccountMeResponse> {
    return apiClient.get<AccountMeResponse>("/v1/me");
  },

  async upsertGuardianProfile(
    data: UpsertGuardianProfileDto,
  ): Promise<{ message: string; guardianProfile: unknown }> {
    return apiClient.put("/v1/me/guardian-profile", data);
  },

  async updatePreferences(
    data: UpdatePreferencesDto,
  ): Promise<{ message: string }> {
    return apiClient.patch("/v1/me/preferences", data);
  },

  // Family & Managed Athlete APIs
  async listManagedAthletes(): Promise<ManagedAthleteLinkItem[]> {
    return apiClient.get<ManagedAthleteLinkItem[]>("/v1/me/athletes");
  },

  async createManagedAthlete(
    data: CreateManagedAthleteDto,
  ): Promise<ManagedAthleteLinkItem> {
    return apiClient.post<ManagedAthleteLinkItem>("/v1/me/athletes", data);
  },

  async getAthlete(athleteId: string): Promise<AthleteProfileResponse> {
    return apiClient.get<AthleteProfileResponse>(`/v1/athletes/${athleteId}`);
  },

  async updateAthlete(
    athleteId: string,
    data: UpdateAthleteDto,
  ): Promise<AthleteProfileResponse> {
    return apiClient.patch<AthleteProfileResponse>(
      `/v1/athletes/${athleteId}`,
      data,
    );
  },

  async revokeFamilyLink(athleteId: string): Promise<{ message: string }> {
    return apiClient.delete(`/v1/me/athletes/${athleteId}/link`);
  },

  // Membership & Billing APIs
  async listAthleteMemberships(
    athleteId: string,
  ): Promise<AthleteMembershipItem[]> {
    return apiClient.get<AthleteMembershipItem[]>(
      `/v1/athletes/${athleteId}/memberships`,
    );
  },

  async createPendingMembership(
    athleteId: string,
    data: CreatePendingMembershipDto,
  ): Promise<AthleteMembershipItem> {
    return apiClient.post<AthleteMembershipItem>(
      `/v1/athletes/${athleteId}/memberships`,
      data,
    );
  },

  async getMembershipBilling(
    athleteId: string,
    membershipId: string,
  ): Promise<MembershipBillingResponse> {
    return apiClient.get<MembershipBillingResponse>(
      `/v1/athletes/${athleteId}/memberships/${membershipId}/billing`,
    );
  },

  async prepareCheckout(
    athleteId: string,
    membershipId: string,
    data: PrepareMembershipCheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    return apiClient.post<CheckoutSessionResponse>(
      `/v1/athletes/${athleteId}/memberships/${membershipId}/checkout`,
      data,
    );
  },
};
