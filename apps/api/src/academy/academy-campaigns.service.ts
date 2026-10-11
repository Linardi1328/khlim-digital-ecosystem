import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  type CampaignAnalyticsQueryDto,
  type CampaignAnalyticsResponseDto,
  type CampaignLeadMetricsDto,
  type CampaignTrafficMetricsDto,
} from "./academy-campaigns.dto";
import { sanitizeCampaignSource } from "./academy-leads.validation";
import { parseMytDateRange } from "./academy-campaigns.validation";
import { DEFAULT_ORGANIZATION_ID } from "../organization/organization.constants";

export { parseMytDateRange };

export const POSTHOG_DEFAULT_QUERY_HOST = "https://us.posthog.com";

@Injectable()
export class AcademyCampaignsService {
  private readonly logger = new Logger(AcademyCampaignsService.name);
  private readonly prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async getCampaignAnalytics(
    organizationId: string,
    query: CampaignAnalyticsQueryDto,
  ): Promise<CampaignAnalyticsResponseDto> {
    const rawCampaign = query.campaign?.trim() || "3x3-oct24";
    const campaign = sanitizeCampaignSource(rawCampaign);
    if (!campaign) {
      throw new BadRequestException("Invalid campaign source token format");
    }

    const { fromUtc, toUtc, startDate, endDate } = parseMytDateRange(
      query.startDate,
      query.endDate,
    );

    // Matching start-inclusive / end-exclusive boundaries: [fromUtc, toUtc)
    const where: Prisma.AcademyLeadWhereInput = {
      organizationId,
      source: campaign,
      createdAt: {
        gte: fromUtc,
        lt: toUtc,
      },
    };

    // 1. Authoritative database leads aggregation
    const records = await this.prisma.client.academyLead.findMany({
      where,
      select: { status: true },
    });

    const byStatus = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      ENROLLED: 0,
      CLOSED: 0,
    };

    for (const record of records) {
      const status = record.status as keyof typeof byStatus;
      if (status in byStatus) {
        byStatus[status]++;
      }
    }

    const totalLeads = records.length;
    const enrolledCount = byStatus.ENROLLED;
    const enrolledRate =
      totalLeads > 0
        ? Number(((enrolledCount / totalLeads) * 100).toFixed(2))
        : 0;

    const leads: CampaignLeadMetricsDto = {
      totalLeads,
      byStatus,
      enrolledCount,
      enrolledRate,
    };

    // 2. Tenant isolation: verify organization is authorized to access campaign traffic
    const isAuthorizedTenant =
      organizationId === DEFAULT_ORGANIZATION_ID || totalLeads > 0;

    let traffic: CampaignTrafficMetricsDto;
    if (!isAuthorizedTenant) {
      traffic = {
        status: "CONFIG_REQUIRED",
        observableLandingSessions: null,
        interestFormEngagement: null,
        clientSubmitSuccesses: null,
        dataCoverage: "None (Tenant isolation enforced)",
        lastRefreshedAt: new Date().toISOString(),
        note: "Traffic aggregation is restricted to the organization operating the campaign.",
        reason: "Campaign is not associated with the active organization",
      };
    } else {
      // 3. PostHog traffic aggregation (server-side, never exposing query credentials)
      traffic = await this.fetchPostHogTraffic(campaign, fromUtc, toUtc);
    }

    return {
      campaign,
      organizationId,
      asOf: new Date().toISOString(),
      period: {
        startDate,
        endDate,
        timezone: "Asia/Kuala_Lumpur",
        fromUtc: fromUtc.toISOString(),
        toUtc: toUtc.toISOString(),
      },
      leads,
      traffic,
      methodologyNote:
        "Database records are authoritative for all confirmed registrations. Conversion rates reflect current status distribution (enrolledCount / totalLeads) in the database, not historical progression. PostHog traffic counts include only visitors who explicitly opted into analytics; non-consenting visitors also generate valid database leads.",
    };
  }

  private async fetchPostHogTraffic(
    campaign: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<CampaignTrafficMetricsDto> {
    const apiKey = (
      process.env.POSTHOG_API_KEY ||
      process.env.POSTHOG_PERSONAL_API_KEY ||
      process.env.POSTHOG_PROJECT_API_KEY
    )?.trim();

    const projectId = process.env.POSTHOG_PROJECT_ID?.trim() || "652783";
    // Separate query host from event ingestion host
    const queryHost = (
      process.env.POSTHOG_QUERY_HOST?.trim() ||
      process.env.POSTHOG_HOST?.trim() ||
      POSTHOG_DEFAULT_QUERY_HOST
    ).replace(/\/+$/, "");

    const baseNotice = {
      dataCoverage:
        "Consented sessions only (opt-in analytics; US Cloud Project 652783)",
      lastRefreshedAt: new Date().toISOString(),
      note: "PostHog traffic represents opted-in web sessions only; it is not a direct measure of physical QR code scans.",
    };

    if (!apiKey) {
      return {
        status: "CONFIG_REQUIRED",
        observableLandingSessions: null,
        interestFormEngagement: null,
        clientSubmitSuccesses: null,
        ...baseNotice,
        reason: "Server-side PostHog query credentials not configured",
      };
    }

    try {
      // Matching start-inclusive / end-exclusive boundary in HogQL
      const dateClause = `AND timestamp >= '${fromUtc.toISOString()}' AND timestamp < '${toUtc.toISOString()}'`;

      const queryPayload = {
        query: {
          kind: "HogQLQuery",
          query: `SELECT event, count(DISTINCT coalesce(properties.$session_id, distinct_id)) FROM events WHERE properties.campaign = '${campaign}' ${dateClause} GROUP BY event`,
        },
      };

      const response = await fetch(
        `${queryHost}/api/projects/${projectId}/query/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(queryPayload),
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `PostHog query API responded with status ${response.status}`,
        );
        let errorDetail = "";
        try {
          const errBody = (await response.json()) as {
            error?: string;
            detail?: string;
          };
          errorDetail = errBody.error || errBody.detail || "";
        } catch {
          // ignore error body parse failure
        }
        return {
          status: "ERROR",
          observableLandingSessions: null,
          interestFormEngagement: null,
          clientSubmitSuccesses: null,
          ...baseNotice,
          reason: errorDetail
            ? `PostHog query API returned HTTP ${response.status}: ${errorDetail}`
            : `PostHog query API responded with HTTP ${response.status}`,
        };
      }

      let data: {
        results?: Array<[string, number]>;
        error?: string;
        detail?: string;
      };
      try {
        data = (await response.json()) as {
          results?: Array<[string, number]>;
          error?: string;
          detail?: string;
        };
      } catch {
        return {
          status: "ERROR",
          observableLandingSessions: null,
          interestFormEngagement: null,
          clientSubmitSuccesses: null,
          ...baseNotice,
          reason: "Failed to parse JSON response from PostHog query API",
        };
      }

      // Validate results array presence
      if (!data || typeof data !== "object" || !Array.isArray(data.results)) {
        return {
          status: "ERROR",
          observableLandingSessions: null,
          interestFormEngagement: null,
          clientSubmitSuccesses: null,
          ...baseNotice,
          reason:
            data?.error ||
            data?.detail ||
            "Malformed response from PostHog query API (missing results array)",
        };
      }

      let observableLandingSessions = 0;
      let interestFormEngagement = 0;
      let clientSubmitSuccesses = 0;

      for (const [eventName, count] of data.results) {
        if (eventName === "campaign_landing") {
          observableLandingSessions = count;
        } else if (eventName === "interest_form_view") {
          interestFormEngagement = count;
        } else if (eventName === "interest_submit_success_client") {
          clientSubmitSuccesses = count;
        }
      }

      return {
        status: "AVAILABLE",
        observableLandingSessions,
        interestFormEngagement,
        clientSubmitSuccesses,
        ...baseNotice,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch PostHog traffic metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        status: "ERROR",
        observableLandingSessions: null,
        interestFormEngagement: null,
        clientSubmitSuccesses: null,
        ...baseNotice,
        reason:
          error instanceof Error
            ? error.message
            : "PostHog query service unavailable or timed out",
      };
    }
  }
}
