"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { useAdminAuth } from "../../lib/auth-context";
import { getAdminAccessToken } from "../../lib/admin-api";

const API = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1"
).replace(/\/+$/, "");
type Entry = {
  id: string;
  type: "ACHIEVEMENT" | "PLAYER_SPOTLIGHT";
  slug?: string | null;
  title: string;
  eventName: string;
  summary: string;
  yearLabel?: string | null;
  playerName?: string | null;
  achievement?: string | null;
  achievedOnLabel?: string | null;
  articleParagraphs?: string[] | null;
  photoLabel: string;
  imageUrl?: string | null;
  factsVerified: boolean;
  aiAssisted: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};
const empty = {
  type: "PLAYER_SPOTLIGHT" as "ACHIEVEMENT" | "PLAYER_SPOTLIGHT",
  slug: "",
  title: "",
  eventName: "",
  summary: "",
  yearLabel: "",
  playerName: "",
  achievement: "",
  achievedOnLabel: "",
  articleParagraphs: "",
  photoLabel: "",
  imageUrl: "",
  factsVerified: false,
  developmentNote: "",
};
async function api(path: string, init?: RequestInit) {
  const token = getAdminAccessToken();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok)
    throw new Error((await response.text()) || `HTTP ${response.status}`);
  return response.json();
}

export default function EditorialStudioPage() {
  const { hasRole } = useAdminAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [message, setMessage] = useState("");
  const managementCanModerate = hasRole(["SUPER_ADMIN", "MANAGEMENT"]);

  const load = async () => {
    try {
      setEntries(await api("/admin/editorial"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function generateDraft() {
    try {
      const draft = await api("/admin/editorial/player-spotlights/draft", {
        method: "POST",
        body: JSON.stringify({
          playerName: form.playerName,
          eventName: form.eventName,
          achievement: form.achievement,
          achievedOnLabel: form.achievedOnLabel,
          developmentNote: form.developmentNote,
        }),
      });
      setForm((current) => ({
        ...current,
        title: draft.headline,
        summary: draft.excerpt,
        articleParagraphs: draft.articleParagraphs.join("\n\n"),
      }));
      setMessage(
        "AI-assisted draft generated from supplied facts. Review it before saving.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  async function save() {
    try {
      const payload = {
        type: form.type,
        slug: form.type === "PLAYER_SPOTLIGHT" ? form.slug : undefined,
        title: form.title,
        eventName: form.eventName,
        summary: form.summary,
        yearLabel: form.type === "ACHIEVEMENT" ? form.yearLabel : undefined,
        playerName:
          form.type === "PLAYER_SPOTLIGHT" ? form.playerName : undefined,
        achievement:
          form.type === "PLAYER_SPOTLIGHT" ? form.achievement : undefined,
        achievedOnLabel:
          form.type === "PLAYER_SPOTLIGHT" ? form.achievedOnLabel : undefined,
        articleParagraphs:
          form.type === "PLAYER_SPOTLIGHT"
            ? form.articleParagraphs.split(/\n\s*\n/).filter(Boolean)
            : undefined,
        photoLabel: form.photoLabel,
        imageUrl: form.imageUrl || undefined,
        factsVerified: form.factsVerified,
        aiAssisted: form.type === "PLAYER_SPOTLIGHT",
      };
      await api("/admin/editorial", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setForm({ ...empty, type: form.type });
      setMessage(
        form.factsVerified
          ? "Draft saved and ready for Management moderation."
          : "Draft saved. Verify facts and photo rights before publication review.",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  const field = (label: string, key: keyof typeof form, placeholder = "") => (
    <label>
      {label}
      <input
        value={String(form[key])}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  return (
    <AdminShell>
      <div>
        <PageHeader
          title="Editorial Studio"
          subtitle="Create verified club achievements and Player Spotlight newsletters, with AI-assisted drafting from staff-supplied facts."
          breadcrumbs={[
            { label: "Operations", href: "/" },
            { label: "Editorial Studio" },
          ]}
        />

        <div className="moderation-rule">
          <div>
            <strong>Drafting and publishing are separate.</strong>
            <span>
              Academy staff prepare and verify drafts here. Only Management or
              Super Admin can approve public publication with MFA.
            </span>
          </div>
          {managementCanModerate && (
            <Link className="moderation-link" href="/moderation">
              Open Moderation Queue
            </Link>
          )}
        </div>

        <div className="editorial-grid">
          <section className="editorial-panel">
            <h2>New editorial draft</h2>
            <label>
              Content type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="PLAYER_SPOTLIGHT">Player Spotlight</option>
                <option value="ACHIEVEMENT">Club Achievement</option>
              </select>
            </label>
            {form.type === "PLAYER_SPOTLIGHT" ? (
              <>
                {field("Player name", "playerName")}
                {field("URL slug", "slug", "player-name-event")}
                {field(
                  "Achievement",
                  "achievement",
                  "Gold medal / selection / milestone",
                )}
                {field("Achievement date", "achievedOnLabel")}
                <label>
                  Development note
                  <textarea
                    value={form.developmentNote}
                    onChange={(e) => set("developmentNote", e.target.value)}
                  />
                </label>
              </>
            ) : (
              field("Year / season label", "yearLabel")
            )}
            {field("Event name", "eventName")}
            {form.type === "PLAYER_SPOTLIGHT" && (
              <Button variant="outline" onClick={generateDraft}>
                Generate AI-assisted draft
              </Button>
            )}
            {field("Headline / title", "title")}
            <label>
              Summary
              <textarea
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </label>
            {form.type === "PLAYER_SPOTLIGHT" && (
              <label>
                Article paragraphs
                <textarea
                  rows={10}
                  value={form.articleParagraphs}
                  onChange={(e) => set("articleParagraphs", e.target.value)}
                />
              </label>
            )}
            {field("Photo description", "photoLabel")}
            {field("Approved photo URL (optional)", "imageUrl")}
            <label className="check">
              <input
                type="checkbox"
                checked={form.factsVerified}
                onChange={(e) => set("factsVerified", e.target.checked)}
              />{" "}
              Facts and photo rights verified by KHLIM staff
            </label>
            <Button onClick={save}>Save draft</Button>
            {message && <p role="status">{message}</p>}
          </section>
          <section>
            <h2>Saved content</h2>
            {entries.length === 0 && <p>No editorial entries yet.</p>}
            {entries.map((entry) => (
              <article className="saved" key={entry.id}>
                <div className="saved-head">
                  <strong>{entry.title}</strong>
                  <span>{entry.status}</span>
                </div>
                <p>
                  {entry.eventName} ·{" "}
                  {entry.factsVerified
                    ? "Facts verified"
                    : "Verification required"}
                </p>
                <div className="review-state">
                  {entry.status === "PUBLISHED"
                    ? "Published content is locked from editing until Management unpublishes it."
                    : entry.factsVerified
                      ? "Ready for Management moderation and publication review."
                      : "Complete staff verification before this draft can be published."}
                </div>
                <div className="actions">
                  {managementCanModerate && (
                    <Link className="moderation-link" href="/moderation">
                      Review in Moderation
                    </Link>
                  )}
                  {entry.type === "PLAYER_SPOTLIGHT" && entry.slug && (
                    <a
                      href={`/spotlight/${entry.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Public URL
                    </a>
                  )}
                </div>
              </article>
            ))}
          </section>
        </div>
        <style jsx>{`
          .moderation-rule {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            margin-bottom: 20px;
            padding: 14px 16px;
            border-radius: 10px;
            border: 1px solid #fde68a;
            background: #fffbeb;
            color: #92400e;
          }
          .moderation-rule div {
            display: grid;
            gap: 3px;
          }
          .moderation-rule span {
            font-size: 0.8125rem;
            line-height: 1.45;
          }
          .moderation-link {
            min-height: 44px;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
            background: #ffffff;
            color: #0f172a;
            font-size: 0.8125rem;
            font-weight: 700;
            text-decoration: none;
            flex-shrink: 0;
          }
          .editorial-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
            gap: 24px;
          }
          .editorial-panel,
          .saved {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
          }
          .saved {
            margin-bottom: 12px;
            padding: 16px;
          }
          .saved-head,
          .actions {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
          }
          .actions {
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          .review-state {
            margin: 10px 0 12px;
            padding: 10px 12px;
            border-radius: 8px;
            background: #f8fafc;
            color: #475569;
            font-size: 0.8125rem;
            line-height: 1.45;
          }
          label {
            display: block;
            font-size: 0.85rem;
            font-weight: 650;
            color: #334155;
            margin: 12px 0;
          }
          input,
          textarea,
          select {
            box-sizing: border-box;
            width: 100%;
            margin-top: 6px;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font: inherit;
          }
          input,
          select {
            min-height: 44px;
          }
          .check {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .check input {
            width: auto;
            min-height: auto;
            margin: 0;
          }
          @media (max-width: 900px) {
            .moderation-rule,
            .editorial-grid {
              grid-template-columns: 1fr;
            }
            .moderation-rule {
              flex-direction: column;
              align-items: stretch;
            }
            .moderation-link {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
