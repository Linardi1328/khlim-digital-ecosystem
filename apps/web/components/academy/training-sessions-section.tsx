"use client";

import React from "react";
import Link from "next/link";
import {
  ACADEMY_LEAD_COACH,
  ACADEMY_TRAINING_SESSIONS,
  ACADEMY_TRAINING_VENUE,
  ACADEMY_WORKING_PRACTICE_DAY,
} from "../../lib/academy-training-config";
import { buildUrlWithSource } from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import { Badge } from "../ui/badge";
import { getButtonStyles } from "../ui/button";
import { Card } from "../ui/card";
import { PublishedRegistrationSessions } from "./published-registration-sessions";

export function TrainingSessionsSection({
  campaignSource,
}: {
  campaignSource: string | null;
}) {
  const { t } = useI18n();
  const interestHref = buildUrlWithSource("/interest", campaignSource);

  return (
    <section
      id="training-sessions"
      aria-labelledby="academy-training-sessions-title"
      style={{ marginBottom: 52, scrollMarginTop: 96 }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <span
          style={{
            color: "#b45309",
            fontSize: "0.8rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {t("academy.trainingSessions.eyebrow")}
        </span>
        <h2
          id="academy-training-sessions-title"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
            margin: "8px 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          {t("academy.trainingSessions.title")}
        </h2>
        <p
          style={{
            color: "#52525b",
            maxWidth: 680,
            margin: "0 auto",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}
        >
          {t("academy.trainingSessions.subtitle")}
        </p>
      </div>

      {/* Confirmed Venue & Lead Coach + Proposed Practice Day */}
      <div className="academy-training-overview-grid">
        <Card
          style={{
            padding: 24,
            borderRadius: 16,
            border: "1px solid #e4e4e7",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#52525b",
              }}
            >
              {t("academy.trainingSessions.venueLabel")}
            </span>
            <Badge variant="success" size="sm">
              {t("academy.trainingSessions.statusConfirmed")}
            </Badge>
          </div>

          <div>
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#18181b",
              }}
            >
              {ACADEMY_TRAINING_VENUE.name}
            </h3>
            <address
              style={{
                fontStyle: "normal",
                color: "#52525b",
                fontSize: "0.92rem",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {ACADEMY_TRAINING_VENUE.addressLine}
            </address>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 12,
              borderTop: "1px solid #f4f4f5",
              marginTop: "auto",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#71717a",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {t("academy.trainingSessions.leadCoachLabel")}
              </div>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#18181b",
                  marginTop: 2,
                }}
              >
                {t("academy.trainingSessions.leadCoachName", {
                  name: ACADEMY_LEAD_COACH.displayName,
                })}
              </div>
            </div>

            <a
              href={ACADEMY_TRAINING_VENUE.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("academy.trainingSessions.directionsAria", {
                venue: ACADEMY_TRAINING_VENUE.name,
              })}
              style={{
                ...getButtonStyles("outline", "md"),
                minHeight: 44,
              }}
            >
              {t("academy.trainingSessions.directionsCta")} ↗
            </a>
          </div>
        </Card>

        <Card
          style={{
            padding: 24,
            borderRadius: 16,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#92400e",
              }}
            >
              {t("academy.trainingSessions.workingDayLabel")}
            </span>
            <Badge variant="warning" size="sm">
              {t("academy.trainingSessions.statusProposed")}
            </Badge>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#78350f",
            }}
          >
            {t(ACADEMY_WORKING_PRACTICE_DAY.dayKey)}
          </h3>

          <p
            style={{
              margin: 0,
              color: "#78350f",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {t("academy.trainingSessions.workingDayNote")}
          </p>

          <p
            style={{
              margin: "auto 0 0",
              paddingTop: 12,
              borderTop: "1px solid #fde68a",
              color: "#92400e",
              fontSize: "0.84rem",
              lineHeight: 1.55,
              fontWeight: 600,
            }}
          >
            {t("academy.trainingSessions.registrationPendingNote")}
          </p>
        </Card>
      </div>

      {/* Confirmed Session Time Cards */}
      <div className="academy-sessions-grid">
        {ACADEMY_TRAINING_SESSIONS.map((session) => (
          <Card
            key={session.id}
            style={{
              padding: 24,
              borderRadius: 16,
              border: "1px solid #e4e4e7",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Badge variant="brand" size="sm">
                {session.pathwayCode}
              </Badge>
              <Badge variant="success" size="sm">
                {t("academy.trainingSessions.timeConfirmedBadge")}
              </Badge>
            </div>

            <div>
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#18181b",
                }}
              >
                {t(session.ageGroupKey)}
              </h3>
              <div
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "#b45309",
                  letterSpacing: "-0.02em",
                }}
              >
                {session.timeRange}
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: "#52525b",
                fontSize: "0.9rem",
                lineHeight: 1.6,
              }}
            >
              {t(session.summaryKey)}
            </p>

            <dl
              style={{
                margin: 0,
                paddingTop: 12,
                borderTop: "1px solid #f4f4f5",
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "6px 12px",
                fontSize: "0.86rem",
              }}
            >
              <dt style={{ color: "#71717a", fontWeight: 600 }}>
                {t("academy.trainingSessions.leadCoachLabel")}
              </dt>
              <dd style={{ margin: 0, color: "#18181b", fontWeight: 700 }}>
                {t("academy.trainingSessions.leadCoachName", {
                  name: ACADEMY_LEAD_COACH.displayName,
                })}
              </dd>

              <dt style={{ color: "#71717a", fontWeight: 600 }}>
                {t("academy.trainingSessions.venueLabel")}
              </dt>
              <dd style={{ margin: 0, color: "#18181b", fontWeight: 700 }}>
                {ACADEMY_TRAINING_VENUE.name}
              </dd>

              <dt style={{ color: "#71717a", fontWeight: 600 }}>
                {t("academy.trainingSessions.workingDayShortLabel")}
              </dt>
              <dd style={{ margin: 0, color: "#92400e", fontWeight: 700 }}>
                {t("academy.trainingSessions.workingDayPendingInline")}
              </dd>
            </dl>

            <div style={{ marginTop: "auto", paddingTop: 8 }}>
              <Link
                href={interestHref}
                style={{
                  ...getButtonStyles("primary", "md"),
                  width: "100%",
                  minHeight: 44,
                  boxSizing: "border-box",
                }}
              >
                {t("nav.registerInterest")}
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Live Authoritative Published Training Sessions (RIC-190 / RIC-191) */}
      <PublishedRegistrationSessions campaignSource={campaignSource} />
    </section>
  );
}
