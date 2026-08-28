"use client";

import React, { useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
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
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [message, setMessage] = useState("");
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
      setMessage("Draft saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  async function transition(id: string, action: "publish" | "unpublish") {
    try {
      await api(`/admin/editorial/${id}/${action}`, { method: "POST" });
      setMessage(
        action === "publish"
          ? "Published to public website."
          : "Removed from public website.",
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
                <div className="actions">
                  {entry.status === "PUBLISHED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => transition(entry.id, "unpublish")}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!entry.factsVerified}
                      onClick={() => transition(entry.id, "publish")}
                    >
                      Publish
                    </Button>
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
          .check {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .check input {
            width: auto;
            margin: 0;
          }
          @media (max-width: 900px) {
            .editorial-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
