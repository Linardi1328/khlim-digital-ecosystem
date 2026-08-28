"use client";

import { createApiClient, type ApiClient } from "@khlim/api-client";
import { getValidAccessToken } from "./supabase-auth";
import type {
  PublicOfferingItem,
  AccountMeResponse,
  GuardianProfile,
  UpsertGuardianProfileDto,
  UpdatePreferencesDto,
  ManagedAthleteLinkItem,
  CreateManagedAthleteDto,
  CreateManagedAthleteResponse,
  UpdateAthleteDto,
  AthleteProfileResponse,
  AthleteMembershipItem,
  CreatePendingMembershipDto,
  MembershipBillingResponse,
  PrepareMembershipCheckoutDto,
  CheckoutSessionResponse,
  ScheduleSessionItem,
  PortalNotificationItem,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: getValidAccessToken,
});

export const apiService = {
  async getPublicOfferings(): Promise<PublicOfferingItem[]> {
    return apiClient.get<PublicOfferingItem[]>("/academy/offerings", {
      authenticated: false,
    });
  },

  async getMe(): Promise<AccountMeResponse> {
    return apiClient.get<AccountMeResponse>("/me");
  },

  async upsertGuardianProfile(
    data: UpsertGuardianProfileDto,
  ): Promise<GuardianProfile> {
    return apiClient.put<GuardianProfile>("/me/guardian-profile", data);
  },

  async updatePreferences(
    data: UpdatePreferencesDto,
  ): Promise<{ id: string; preferredLocale: string; updatedAt: string }> {
    return apiClient.patch("/me/preferences", data);
  },

  async listManagedAthletes(): Promise<ManagedAthleteLinkItem[]> {
    return apiClient.get<ManagedAthleteLinkItem[]>("/me/athletes");
  },

  async createManagedAthlete(
    data: CreateManagedAthleteDto,
  ): Promise<CreateManagedAthleteResponse> {
    return apiClient.post<CreateManagedAthleteResponse>("/me/athletes", data);
  },

  async getAthlete(athleteId: string): Promise<AthleteProfileResponse> {
    return apiClient.get<AthleteProfileResponse>(`/athletes/${athleteId}`);
  },

  async updateAthlete(
    athleteId: string,
    data: UpdateAthleteDto,
  ): Promise<AthleteProfileResponse> {
    return apiClient.patch<AthleteProfileResponse>(
      `/athletes/${athleteId}`,
      data,
    );
  },

  async revokeFamilyLink(
    athleteId: string,
  ): Promise<{ id: string; status: string; revokedAt: string }> {
    return apiClient.delete(`/me/athletes/${athleteId}/link`);
  },

  async listAthleteMemberships(
    athleteId: string,
  ): Promise<AthleteMembershipItem[]> {
    return apiClient.get<AthleteMembershipItem[]>(
      `/athletes/${athleteId}/memberships`,
    );
  },

  async createPendingMembership(
    athleteId: string,
    data: CreatePendingMembershipDto,
  ): Promise<AthleteMembershipItem> {
    return apiClient.post<AthleteMembershipItem>(
      `/athletes/${athleteId}/memberships`,
      data,
    );
  },

  async getMembershipBilling(
    athleteId: string,
    membershipId: string,
  ): Promise<MembershipBillingResponse> {
    return apiClient.get<MembershipBillingResponse>(
      `/athletes/${athleteId}/memberships/${membershipId}/billing`,
    );
  },

  async prepareCheckout(
    athleteId: string,
    membershipId: string,
    data: PrepareMembershipCheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    return apiClient.post<CheckoutSessionResponse>(
      `/athletes/${athleteId}/memberships/${membershipId}/checkout`,
      data,
    );
  },

  async listMySchedule(): Promise<ScheduleSessionItem[]> {
    return apiClient.get<ScheduleSessionItem[]>("/me/schedule");
  },

  async listMyNotifications(): Promise<PortalNotificationItem[]> {
    return apiClient.get<PortalNotificationItem[]>("/me/notifications");
  },

  async markNotificationRead(
    receiptId: string,
  ): Promise<{ id: string; readAt: string | null }> {
    return apiClient.post(`/me/notifications/${receiptId}/read`, {});
  },
};
