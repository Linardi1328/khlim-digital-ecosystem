"use client";

import React, { Suspense, useState, useMemo } from "react";
import { notFound } from "next/navigation";
import { PublicHeader } from "../../../components/layout/public-header";
import { PublicFooter } from "../../../components/layout/public-footer";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { useI18n } from "../../../lib/i18n-context";
import {
  STAGED_MEDIA_ASSETS,
  getMediaAuthorizationScorecard,
  type MediaCategory,
} from "../../../lib/media-registry";

const CURRENT_LOGO_FILE = "/khs-academy-logo.webp";
const CANDIDATE_LAUREL_FILE = "branding/khlim-laurel-crest.webp";
const CANDIDATE_MARK_FILE = "branding/khs-academy-mark.webp";
const CANDIDATE_CLUB_FILE = "branding/kh-basketball-club.webp";

function MediaPreviewContent() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<
    MediaCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<"staging" | "publicSafe">("staging");

  const scorecard = useMemo(() => getMediaAuthorizationScorecard(), []);

  const filteredAssets = useMemo(() => {
    if (selectedCategory === "all") {
      return STAGED_MEDIA_ASSETS;
    }
    return STAGED_MEDIA_ASSETS.filter(
      (asset) => asset.category === selectedCategory,
    );
  }, [selectedCategory]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
      }}
    >
      <PublicHeader />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 20px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* Header Section */}
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Badge variant="brand">{t("mediaPreview.eyebrow")}</Badge>
            <Badge variant="neutral">{t("mediaPreview.localhostOnly")}</Badge>
          </div>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
              margin: "0 0 12px",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "#0f172a",
            }}
          >
            {t("mediaPreview.title")}
          </h1>
          <p
            style={{
              color: "#475569",
              fontSize: "1.05rem",
              maxWidth: 800,
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            {t("mediaPreview.description")}
          </p>

          {/* Prominent Fail-Closed Notice */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderLeft: "5px solid #d97706",
              borderRadius: 8,
              padding: "16px 20px",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>⚠️</span>
            <div>
              <strong
                style={{
                  display: "block",
                  color: "#92400e",
                  fontSize: "0.95rem",
                  marginBottom: 4,
                }}
              >
                {t("mediaPreview.notice")}
              </strong>
              <span
                style={{
                  color: "#78350f",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                }}
              >
                {t("mediaPreview.noticeDetails")}
              </span>
            </div>
          </div>
        </section>

        {/* Authorization Scorecard Dashboard */}
        <section style={{ marginBottom: 40 }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: "0 0 16px",
              color: "#1e293b",
            }}
          >
            {t("mediaPreview.scorecard.title")}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Card style={{ padding: 20, borderTop: "4px solid #3b82f6" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {t("mediaPreview.scorecard.totalStaged")}
              </span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: "6px 0 2px",
                }}
              >
                {scorecard.totalStaged}
              </div>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                {t("mediaPreview.scorecard.totalStagedSubtitle")}
              </span>
            </Card>

            <Card style={{ padding: 20, borderTop: "4px solid #f59e0b" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#b45309",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {t("mediaPreview.scorecard.brandOwner")}
              </span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#b45309",
                  margin: "6px 0 2px",
                }}
              >
                {scorecard.brandOwnerApprovalRequiredCount}
              </div>
              <span style={{ fontSize: "0.8rem", color: "#78350f" }}>
                {t("mediaPreview.scorecard.brandOwnerSubtitle")}
              </span>
            </Card>

            <Card style={{ padding: 20, borderTop: "4px solid #8b5cf6" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#6d28d9",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {t("mediaPreview.scorecard.mascot")}
              </span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#6d28d9",
                  margin: "6px 0 2px",
                }}
              >
                {scorecard.mascotArtworkApprovalRequiredCount}
              </div>
              <span style={{ fontSize: "0.8rem", color: "#5b21b6" }}>
                {t("mediaPreview.scorecard.mascotSubtitle")}
              </span>
            </Card>

            <Card style={{ padding: 20, borderTop: "4px solid #06b6d4" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#0e7490",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {t("mediaPreview.scorecard.coaches")}
              </span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#0e7490",
                  margin: "6px 0 2px",
                }}
              >
                {scorecard.coachAndPhotographerReleaseRequiredCount}
              </div>
              <span style={{ fontSize: "0.8rem", color: "#155e75" }}>
                {t("mediaPreview.scorecard.coachesSubtitle")}
              </span>
            </Card>

            <Card style={{ padding: 20, borderTop: "4px solid #ef4444" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#b91c1c",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {t("mediaPreview.scorecard.guardian")}
              </span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#b91c1c",
                  margin: "6px 0 2px",
                }}
              >
                {scorecard.guardianAndPhotographerConsentRequiredCount}
              </div>
              <span style={{ fontSize: "0.8rem", color: "#991b1b" }}>
                {t("mediaPreview.scorecard.guardianSubtitle")}
              </span>
            </Card>

            <Card style={{ padding: 20, borderTop: "4px solid #10b981" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#047857",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {t("mediaPreview.scorecard.publicReady")}
              </span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#047857",
                  margin: "6px 0 2px",
                }}
              >
                {scorecard.publicReadyCount} / {scorecard.totalStaged}
              </div>
              <span style={{ fontSize: "0.8rem", color: "#065f46" }}>
                {t("mediaPreview.scorecard.publicReadySubtitle")}
              </span>
            </Card>
          </div>
        </section>

        {/* Controls Toolbar: Mode Switcher & Category Tabs */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            marginBottom: 32,
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { id: "all", label: t("mediaPreview.tab.all") },
              { id: "branding", label: t("mediaPreview.tab.branding") },
              { id: "khero", label: t("mediaPreview.tab.khero") },
              { id: "coaches", label: t("mediaPreview.tab.coaches") },
              { id: "youth", label: t("mediaPreview.tab.youth") },
            ].map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(tab.id as MediaCategory | "all")
                  }
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
                    background: active ? "#0f172a" : "#ffffff",
                    color: active ? "#ffffff" : "#334155",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}
            >
              {t("mediaPreview.viewMode.label")}:
            </span>
            <div
              style={{
                display: "inline-flex",
                background: "#f1f5f9",
                borderRadius: 8,
                padding: 3,
                border: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("staging")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    viewMode === "staging" ? "#ffffff" : "transparent",
                  color: viewMode === "staging" ? "#0f172a" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  boxShadow:
                    viewMode === "staging"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
              >
                {t("mediaPreview.viewMode.staging")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("publicSafe")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    viewMode === "publicSafe" ? "#ffffff" : "transparent",
                  color: viewMode === "publicSafe" ? "#0f172a" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  boxShadow:
                    viewMode === "publicSafe"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                }}
              >
                {t("mediaPreview.viewMode.publicSafe")}
              </button>
            </div>
          </div>
        </section>

        {/* Section: Brand Identity Deep Dive (when relevant) */}
        {(selectedCategory === "all" || selectedCategory === "branding") && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <h3
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: "0 0 6px",
                }}
              >
                {t("mediaPreview.branding.title")}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
                {t("mediaPreview.branding.description")}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {/* Existing Confirmed Brand Crest */}
              <Card
                style={{
                  padding: 24,
                  border: "2px solid #10b981",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Badge variant="brand">
                    {t("mediaPreview.branding.activeBadge")}
                  </Badge>
                </div>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#09090b",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <img
                    src="/khs-academy-logo.webp"
                    alt={t("mediaPreview.branding.activeTitle")}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <strong
                  style={{
                    fontSize: "1rem",
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  {t("mediaPreview.branding.activeTitle")}
                </strong>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  <code>{CURRENT_LOGO_FILE}</code> {"· 500 × 500"}
                </span>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#334155",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {t("mediaPreview.branding.activeNote")}
                </p>
              </Card>

              {/* Proposed Candidate 1: Laurel Crest */}
              <Card
                style={{
                  padding: 24,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Badge variant="neutral">
                    {t("mediaPreview.branding.corporateBadge")}
                  </Badge>
                </div>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#09090b",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  {viewMode === "staging" ? (
                    <img
                      src="/api/preview-media/branding/khlim-laurel-crest.webp"
                      alt={t("mediaPreview.branding.laurelTitle")}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>
                      {t("mediaPreview.branding.previewGated")}
                    </span>
                  )}
                </div>
                <strong
                  style={{
                    fontSize: "1rem",
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  {t("mediaPreview.branding.laurelTitle")}
                </strong>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  <code>{CANDIDATE_LAUREL_FILE}</code> {"· 499 × 500"}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#b45309",
                    fontWeight: 700,
                  }}
                >
                  {t("mediaPreview.status.ownerRequired")}
                </span>
              </Card>

              {/* Proposed Candidate 2: Horizontal Mark */}
              <Card
                style={{
                  padding: 24,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Badge variant="neutral">
                    {t("mediaPreview.branding.horizontalBadge")}
                  </Badge>
                </div>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#09090b",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  {viewMode === "staging" ? (
                    <img
                      src="/api/preview-media/branding/khs-academy-mark.webp"
                      alt={t("mediaPreview.branding.markTitle")}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>
                      {t("mediaPreview.branding.previewGated")}
                    </span>
                  )}
                </div>
                <strong
                  style={{
                    fontSize: "1rem",
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  {t("mediaPreview.branding.markTitle")}
                </strong>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  <code>{CANDIDATE_MARK_FILE}</code> {"· 674 × 410"}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#b45309",
                    fontWeight: 700,
                  }}
                >
                  {t("mediaPreview.status.ownerRequired")}
                </span>
              </Card>

              {/* Proposed Candidate 3: Club Badge */}
              <Card
                style={{
                  padding: 24,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Badge variant="neutral">
                    {t("mediaPreview.branding.clubBadge")}
                  </Badge>
                </div>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#09090b",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  {viewMode === "staging" ? (
                    <img
                      src="/api/preview-media/branding/kh-basketball-club.webp"
                      alt={t("mediaPreview.branding.clubTitle")}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>
                      {t("mediaPreview.branding.previewGated")}
                    </span>
                  )}
                </div>
                <strong
                  style={{
                    fontSize: "1rem",
                    color: "#0f172a",
                    marginBottom: 4,
                  }}
                >
                  {t("mediaPreview.branding.clubTitle")}
                </strong>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  <code>{CANDIDATE_CLUB_FILE}</code> {"· 800 × 728"}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#b45309",
                    fontWeight: 700,
                  }}
                >
                  {t("mediaPreview.status.ownerRequired")}
                </span>
              </Card>
            </div>
          </section>
        )}

        {/* Section: KHero Mascot & 3-Language Accessibility Review */}
        {(selectedCategory === "all" || selectedCategory === "khero") && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <h3
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {t("mediaPreview.khero.title")}
                </h3>
                <Badge variant="neutral">{t("mediaPreview.khero.badge")}</Badge>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
                {t("mediaPreview.khero.description")}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 24,
              }}
            >
              {/* Meet KHero Card */}
              <Card style={{ padding: 20, overflow: "hidden" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1240 / 1748",
                    background: "#18181b",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  {viewMode === "staging" ? (
                    <img
                      src="/api/preview-media/khero/meet-khero.webp"
                      alt={t("home.khero.poster.meet")}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        padding: 20,
                        textAlign: "center",
                        color: "#e4e4e7",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      {t("compliance.khero.mediaPendingRights")}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {t("home.khero.poster.meet")}
                  </h4>
                  <Badge variant="neutral">{"1240 × 1748"}</Badge>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6d28d9",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {t("mediaPreview.status.mascotRequired")}
                </div>
                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "12px 14px",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                  }}
                >
                  <strong
                    style={{
                      color: "#0f172a",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {t("home.khero.poster.meet.tagline")}
                  </strong>
                  <span
                    style={{
                      color: "#64748b",
                      display: "block",
                      fontSize: "0.75rem",
                      marginBottom: 6,
                    }}
                  >
                    {t("home.khero.poster.meet.details")}
                  </span>
                  <p style={{ margin: 0, color: "#334155" }}>
                    {t("home.khero.poster.meet.story")}
                  </p>
                </div>
              </Card>

              {/* KHero Meaning Card */}
              <Card style={{ padding: 20, overflow: "hidden" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1240 / 1748",
                    background: "#18181b",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  {viewMode === "staging" ? (
                    <img
                      src="/api/preview-media/khero/khero-meaning.webp"
                      alt={t("home.khero.poster.meaning")}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        padding: 20,
                        textAlign: "center",
                        color: "#e4e4e7",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      {t("compliance.khero.mediaPendingRights")}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {t("home.khero.poster.meaning")}
                  </h4>
                  <Badge variant="neutral">{"1240 × 1748"}</Badge>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6d28d9",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {t("mediaPreview.status.mascotRequired")}
                </div>
                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "12px 14px",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                  }}
                >
                  <strong
                    style={{
                      color: "#0f172a",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {t("home.khero.poster.meaning.tagline")}
                  </strong>
                  <span
                    style={{
                      color: "#64748b",
                      display: "block",
                      fontSize: "0.75rem",
                      marginBottom: 6,
                    }}
                  >
                    {t("home.khero.poster.meaning.origin")}
                  </span>
                  <p style={{ margin: 0, color: "#334155" }}>
                    {t("home.khero.poster.meaning.values")}
                  </p>
                </div>
              </Card>

              {/* The KHero Way Card */}
              <Card style={{ padding: 20, overflow: "hidden" }}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1240 / 1748",
                    background: "#18181b",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  {viewMode === "staging" ? (
                    <img
                      src="/api/preview-media/khero/khero-way.webp"
                      alt={t("home.khero.poster.way")}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        padding: 20,
                        textAlign: "center",
                        color: "#e4e4e7",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                      }}
                    >
                      {t("compliance.khero.mediaPendingRights")}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {t("home.khero.poster.way")}
                  </h4>
                  <Badge variant="neutral">{"1240 × 1748"}</Badge>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6d28d9",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {t("mediaPreview.status.mascotRequired")}
                </div>
                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "12px 14px",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                  }}
                >
                  <strong
                    style={{
                      color: "#0f172a",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {t("home.khero.poster.way.tagline")}
                  </strong>
                  <span
                    style={{
                      color: "#64748b",
                      display: "block",
                      fontSize: "0.75rem",
                      marginBottom: 6,
                    }}
                  >
                    {t("home.khero.poster.way.motto")}
                  </span>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 16,
                      color: "#334155",
                      fontSize: "0.8rem",
                    }}
                  >
                    <li>{t("home.khero.poster.way.p1")}</li>
                    <li>{t("home.khero.poster.way.p2")}</li>
                    <li>{t("home.khero.poster.way.p3")}</li>
                    <li>{t("home.khero.poster.way.p4")}</li>
                  </ul>
                </div>
              </Card>
            </div>
          </section>
        )}

        {/* Section: Coaches 720x900 Responsive Media */}
        {(selectedCategory === "all" || selectedCategory === "coaches") && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <h3
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: "0 0 6px",
                }}
              >
                {t("mediaPreview.coaches.title")}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
                {t("mediaPreview.coaches.description")}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  id: "seng-jun",
                  name: t("academy.coaches.sengJun.name"),
                  file: "restricted_pending_approval/coaches/seng-jun-portrait-720.webp",
                },
                {
                  id: "jia-xuan",
                  name: t("academy.coaches.jiaXuan.name"),
                  file: "restricted_pending_approval/coaches/jia-xuan-portrait-720.webp",
                },
                {
                  id: "puimann",
                  name: t("academy.coaches.puimann.name"),
                  file: "restricted_pending_approval/coaches/puimann-portrait-720.webp",
                },
                {
                  id: "woon",
                  name: t("academy.coaches.woon.name"),
                  file: "restricted_pending_approval/coaches/woon-portrait-720.webp",
                },
              ].map((coach) => (
                <Card
                  key={coach.id}
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 5",
                      background: "#18181b",
                      borderRadius: 8,
                      overflow: "hidden",
                      marginBottom: 12,
                    }}
                  >
                    {viewMode === "staging" ? (
                      <img
                        src={`/api/preview-media/${coach.file}`}
                        alt={coach.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center top",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "grid",
                          placeItems: "center",
                          color: "#94a3b8",
                          fontSize: "1.5rem",
                          fontWeight: 700,
                        }}
                      >
                        {coach.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                    )}
                  </div>
                  <strong
                    style={{
                      fontSize: "1rem",
                      color: "#0f172a",
                      marginBottom: 2,
                    }}
                  >
                    {coach.name}
                  </strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      marginBottom: 8,
                    }}
                  >
                    {t("mediaPreview.coaches.crop")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#0e7490",
                      fontWeight: 700,
                    }}
                  >
                    {t("mediaPreview.status.coachRequired")}
                  </span>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section: Youth Minors (Fail-Closed Protection Review) */}
        {(selectedCategory === "all" || selectedCategory === "youth") && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <h3
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {t("mediaPreview.youth.title")}
                </h3>
                <Badge variant="neutral">{t("mediaPreview.youth.badge")}</Badge>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
                {t("mediaPreview.youth.description")}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {STAGED_MEDIA_ASSETS.filter((a) => a.isYouthMinor).map(
                (asset) => (
                  <Card key={asset.id} style={{ padding: 16 }}>
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: asset.width > 1500 ? "16 / 10" : "16 / 9",
                        background: "#09090b",
                        borderRadius: 8,
                        overflow: "hidden",
                        marginBottom: 12,
                      }}
                    >
                      {viewMode === "staging" ? (
                        <>
                          <img
                            src={asset.stagingPreviewUrl}
                            alt={asset.suggestedPlacement}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                              background: "rgba(15, 23, 42, 0.8)",
                              color: "#f8fafc",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                            }}
                          >
                            {t("mediaPreview.youth.privatePreviewOnly")}
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "grid",
                            placeItems: "center",
                            padding: 16,
                            textAlign: "center",
                            color: "#f87171",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                          }}
                        >
                          {t("mediaPreview.youth.withheldNotice")}
                        </div>
                      )}
                    </div>
                    <strong
                      style={{
                        fontSize: "0.95rem",
                        color: "#0f172a",
                        display: "block",
                        marginBottom: 2,
                      }}
                    >
                      {asset.suggestedPlacement}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      <code>{asset.file}</code> {"·"}{" "}
                      {`${asset.width} × ${asset.height}`}
                    </span>
                    <div
                      style={{
                        color: "#b91c1c",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      {t("mediaPreview.status.guardianRequired")}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "#475569",
                        lineHeight: 1.4,
                      }}
                    >
                      {asset.notes}
                    </p>
                  </Card>
                ),
              )}
            </div>
          </section>
        )}

        {/* Complete Inventory Audit Table */}
        <section style={{ marginTop: 48 }}>
          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 16,
            }}
          >
            {t("mediaPreview.registry.title")}
          </h3>
          <div
            style={{
              overflowX: "auto",
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {t("mediaPreview.table.asset")}
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {t("mediaPreview.table.placement")}
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {t("mediaPreview.table.rightsStatus")}
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {t("mediaPreview.table.authorizationRequired")}
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {t("mediaPreview.table.publicTreeStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ color: "#0f172a", display: "block" }}>
                        {asset.file}
                      </strong>
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                        {t("mediaPreview.table.sourceLabel")} {asset.sourceFile}{" "}
                        {"·"} {`${asset.width} × ${asset.height}`}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {asset.suggestedPlacement}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge
                        variant={
                          asset.rightsStatus === "VERIFIED"
                            ? "brand"
                            : asset.isYouthMinor
                              ? "neutral"
                              : "neutral"
                        }
                      >
                        {asset.rightsStatus}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>
                      {asset.authorizationRequiredFrom.join(", ")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "#fee2e2",
                          color: "#991b1b",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {t("mediaPreview.registry.withheldBadge")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function MediaPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          {t("mediaPreview.loading")}
        </div>
      }
    >
      <MediaPreviewContent />
    </Suspense>
  );
}
