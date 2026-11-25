"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  isFeatureNotAvailableError,
  type PublicRegistrationSessionDto,
  type RegistrationConfigDto,
} from "@khlim/api-client";
import { apiService } from "../../lib/api-service";
import {
  formatDateOnlyForLocale,
  formatMytTimestampForLocale,
  formatSessionTimeRange,
} from "../../lib/academy-registration-utils";
import { buildUrlWithSource } from "../../lib/campaign-source";
import { useI18n } from "../../lib/i18n-context";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button, getButtonStyles } from "../ui/button";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export type AcademyAvailabilityState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "deferred" }
  | { status: "closed"; config: RegistrationConfigDto }
  | { status: "empty"; config: RegistrationConfigDto }
  | {
      status: "open";
      config: RegistrationConfigDto;
      sessions: PublicRegistrationSessionDto[];
    };

export function PublishedRegistrationSessions({
  campaignSource,
  availabilityState,
  onRetry,
  prioritized = false,
}: {
  campaignSource: string | null;
  availabilityState?: AcademyAvailabilityState;
  onRetry?: () => void;
  prioritized?: boolean;
}) {
  const { t, locale } = useI18n();
  const isControlled = availabilityState !== undefined;
  const [internalState, setInternalState] = useState<AcademyAvailabilityState>({
    status: "loading",
  });

  const loadSessions = useCallback(async () => {
    setInternalState({ status: "loading" });
    try {
      const [config, sessionsResponse] = await Promise.all([
        apiService.getAcademyRegistrationConfig(),
        apiService.listPublicAcademySessions(),
      ]);

      if (!config.registrationOpen || !sessionsResponse.registrationOpen) {
        setInternalState({ status: "closed", config });
        return;
      }

      if (!sessionsResponse.items || sessionsResponse.items.length === 0) {
        setInternalState({ status: "empty", config });
        return;
      }

      setInternalState({
        status: "open",
        config,
        sessions: sessionsResponse.items,
      });
    } catch (error) {
      setInternalState(
        isFeatureNotAvailableError(error)
          ? { status: "deferred" }
          : { status: "error" },
      );
    }
  }, []);

  useEffect(() => {
    if (isControlled) return;
    let active = true;
    const run = async () => {
      try {
        const [config, sessionsResponse] = await Promise.all([
          apiService.getAcademyRegistrationConfig(),
          apiService.listPublicAcademySessions(),
        ]);
        if (!active) return;
        if (!config.registrationOpen || !sessionsResponse.registrationOpen) {
          setInternalState({ status: "closed", config });
          return;
        }
        if (!sessionsResponse.items || sessionsResponse.items.length === 0) {
          setInternalState({ status: "empty", config });
          return;
        }
        setInternalState({
          status: "open",
          config,
          sessions: sessionsResponse.items,
        });
      } catch (error) {
        if (!active) return;
        setInternalState(
          isFeatureNotAvailableError(error)
            ? { status: "deferred" }
            : { status: "error" },
        );
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [isControlled]);

  const state = availabilityState ?? internalState;
  const handleRetry = onRetry ?? loadSessions;

  const interestHref = buildUrlWithSource("/interest", campaignSource);

  const formatAgeRange = (session: PublicRegistrationSessionDto): string => {
    if (session.minAge !== null && session.maxAge !== null) {
      return t("academyReg.sessions.ageRange", {
        min: session.minAge,
        max: session.maxAge,
      });
    }
    if (session.minAge !== null) {
      return t("academyReg.sessions.ageMinOnly", { min: session.minAge });
    }
    if (session.maxAge !== null) {
      return t("academyReg.sessions.ageMaxOnly", { max: session.maxAge });
    }
    return "";
  };

  const formatSchedule = (session: PublicRegistrationSessionDto): string => {
    const weekday =
      session.weekday && session.weekday >= 1 && session.weekday <= 7
        ? t(`academyReg.sessions.weekday.${session.weekday}`)
        : "";
    const timeRange = formatSessionTimeRange(
      session.startTime,
      session.endTime,
    );
    return [weekday, timeRange].filter(Boolean).join(" · ");
  };

  return (
    <div
      id="published-registration-sessions"
      data-testid="published-registration-sessions"
      style={{ marginTop: prioritized ? 0 : 32 }}
    >
      {!prioritized ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              color: "#b45309",
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {t("academyReg.sessions.eyebrow")}
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.75rem)",
              fontWeight: 800,
              color: "#18181b",
              letterSpacing: "-0.02em",
            }}
          >
            {t("academyReg.sessions.title")}
          </h3>
          <p
            style={{
              margin: 0,
              color: "#52525b",
              fontSize: "0.94rem",
              lineHeight: 1.6,
              maxWidth: 680,
            }}
          >
            {t("academyReg.sessions.subtitle")}
          </p>
        </div>
      ) : null}

      {state.status === "loading" && (
        <div
          aria-busy="true"
          aria-live="polite"
          data-testid="registration-sessions-loading"
          className="academy-sessions-grid"
        >
          <span className="sr-only">{t("academyReg.sessions.loading")}</span>
          {[0, 1].map((idx) => (
            <Card
              key={idx}
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
              <Skeleton width="40%" height={20} />
              <Skeleton width="75%" height={28} />
              <Skeleton width="100%" height={16} />
              <Skeleton width="90%" height={16} />
              <Skeleton width="100%" height={44} />
            </Card>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div data-testid="registration-sessions-error" role="alert">
          <Alert variant="warning" title={t("academyReg.sessions.errorTitle")}>
            <p style={{ margin: "0 0 16px", lineHeight: 1.55 }}>
              {t("academyReg.sessions.errorBody")}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void handleRetry()}
                style={{ minHeight: 44 }}
              >
                {t("academyReg.sessions.retry")}
              </Button>
              <Link
                href={interestHref}
                style={{ ...getButtonStyles("outline", "md"), minHeight: 44 }}
              >
                {t("nav.registerInterest")}
              </Link>
            </div>
          </Alert>
        </div>
      )}

      {state.status === "deferred" && (
        <Card
          data-testid="registration-sessions-deferred"
          style={{
            padding: 28,
            borderRadius: 16,
            border: "1px solid #e4e4e7",
            background: "#fafafa",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <Badge variant="neutral" size="sm">
              {t("academyReg.sessions.deferredBadge")}
            </Badge>
          </div>
          <h4
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#18181b",
            }}
          >
            {t("academyReg.sessions.deferredTitle")}
          </h4>
          <p
            style={{
              margin: 0,
              color: "#52525b",
              fontSize: "0.94rem",
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            {t("academyReg.sessions.deferredBody")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <Link
              href={interestHref}
              style={{ ...getButtonStyles("primary", "md"), minHeight: 44 }}
            >
              {t("nav.registerInterest")}
            </Link>
          </div>
        </Card>
      )}

      {state.status === "closed" && (
        <Card
          data-testid="registration-sessions-closed"
          style={{
            padding: 28,
            borderRadius: 16,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <Badge variant="warning" size="sm">
              {t("academyReg.sessions.closedBadge")}
            </Badge>
          </div>
          <h4
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#78350f",
            }}
          >
            {t("academyReg.sessions.closedTitle")}
          </h4>
          <p
            style={{
              margin: 0,
              color: "#78350f",
              fontSize: "0.94rem",
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            {t("academyReg.sessions.closedBody")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <Link
              href={interestHref}
              style={{ ...getButtonStyles("primary", "md"), minHeight: 44 }}
            >
              {t("nav.registerInterest")}
            </Link>
          </div>
        </Card>
      )}

      {state.status === "empty" && (
        <Card
          data-testid="registration-sessions-empty"
          style={{
            padding: 28,
            borderRadius: 16,
            border: "1px solid #e4e4e7",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <Badge variant="neutral" size="sm">
              {t("academyReg.sessions.emptyBadge")}
            </Badge>
          </div>
          <h4
            style={{
              margin: 0,
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#18181b",
            }}
          >
            {t("academyReg.sessions.emptyTitle")}
          </h4>
          <p
            style={{
              margin: 0,
              color: "#52525b",
              fontSize: "0.94rem",
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            {t("academyReg.sessions.emptyBody")}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <Link
              href={interestHref}
              style={{ ...getButtonStyles("primary", "md"), minHeight: 44 }}
            >
              {t("nav.registerInterest")}
            </Link>
          </div>
        </Card>
      )}

      {state.status === "open" && (
        <div
          data-testid="registration-sessions-available"
          className="academy-sessions-grid"
        >
          {state.sessions.map((session) => {
            const registerHref = buildUrlWithSource(
              "/academy/register",
              campaignSource,
              { sessionId: session.id },
            );
            const ageRange = formatAgeRange(session);
            const scheduleText = formatSchedule(session);
            const firstDateText = formatDateOnlyForLocale(
              session.firstSessionDate,
              locale,
            );
            const recurrenceText = session.recurrence
              ? t(`academyReg.sessions.recurrence.${session.recurrence}`)
              : "";
            const closesText = session.registrationClosesAt
              ? t("academyReg.sessions.windowCloses", {
                  date: formatMytTimestampForLocale(
                    session.registrationClosesAt,
                    locale,
                  ),
                })
              : "";

            return (
              <Card
                key={session.id}
                data-testid={`published-session-card-${session.id}`}
                style={{
                  padding: 24,
                  borderRadius: 16,
                  border: "1px solid #e4e4e7",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: "0 10px 28px rgba(24, 24, 27, 0.05)",
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
                    {session.programmeName}
                  </Badge>
                  <Badge variant="success" size="sm">
                    {t("academyReg.sessions.openBadge")}
                  </Badge>
                </div>

                <div>
                  <h4
                    style={{
                      margin: "0 0 6px",
                      fontSize: "1.22rem",
                      fontWeight: 800,
                      color: "#18181b",
                    }}
                  >
                    {session.name}
                  </h4>
                  {scheduleText ? (
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#b45309",
                      }}
                    >
                      {scheduleText}
                    </div>
                  ) : null}
                </div>

                <dl className="registration-session-dl">
                  {ageRange ? (
                    <>
                      <dt style={{ color: "#71717a", fontWeight: 600 }}>
                        {t("academyReg.sessions.ageLabel")}
                      </dt>
                      <dd
                        style={{ margin: 0, color: "#18181b", fontWeight: 700 }}
                      >
                        {ageRange}
                      </dd>
                    </>
                  ) : null}

                  <dt style={{ color: "#71717a", fontWeight: 600 }}>
                    {t("academyReg.sessions.venueLabel")}
                  </dt>
                  <dd style={{ margin: 0, color: "#18181b", fontWeight: 700 }}>
                    <div>{session.venue.name}</div>
                    {session.venue.address ? (
                      <div
                        style={{
                          fontWeight: 400,
                          color: "#52525b",
                          fontSize: "0.82rem",
                          marginTop: 2,
                          lineHeight: 1.45,
                        }}
                      >
                        {session.venue.address}
                      </div>
                    ) : null}
                  </dd>

                  {session.coachDisplayName ? (
                    <>
                      <dt style={{ color: "#71717a", fontWeight: 600 }}>
                        {t("academyReg.sessions.coachLabel")}
                      </dt>
                      <dd
                        style={{ margin: 0, color: "#18181b", fontWeight: 700 }}
                      >
                        {session.coachDisplayName}
                      </dd>
                    </>
                  ) : null}

                  {firstDateText ? (
                    <>
                      <dt style={{ color: "#71717a", fontWeight: 600 }}>
                        {t("academyReg.sessions.firstDateLabel")}
                      </dt>
                      <dd
                        style={{ margin: 0, color: "#18181b", fontWeight: 600 }}
                      >
                        {firstDateText}
                      </dd>
                    </>
                  ) : null}

                  {recurrenceText ? (
                    <>
                      <dt style={{ color: "#71717a", fontWeight: 600 }}>
                        {t("academyReg.sessions.recurrenceLabel")}
                      </dt>
                      <dd
                        style={{ margin: 0, color: "#18181b", fontWeight: 600 }}
                      >
                        {recurrenceText}
                      </dd>
                    </>
                  ) : null}
                </dl>

                {closesText ? (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#52525b",
                      paddingTop: 4,
                    }}
                  >
                    {closesText}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <Link
                    href={registerHref}
                    data-testid={`register-now-${session.id}`}
                    style={{
                      ...getButtonStyles("primary", "md"),
                      width: "100%",
                      minHeight: 44,
                      boxSizing: "border-box",
                    }}
                  >
                    {t("academyReg.sessions.registerNow")}
                  </Link>
                  <Link
                    href={interestHref}
                    style={{
                      ...getButtonStyles("outline", "sm"),
                      width: "100%",
                      minHeight: 44,
                      boxSizing: "border-box",
                    }}
                  >
                    {t("academyReg.sessions.registerInterestAlternative")}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
