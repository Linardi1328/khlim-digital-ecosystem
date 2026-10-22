"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PublicFooter } from "../layout/public-footer";
import { PublicHeader } from "../layout/public-header";
import { Card, CardContent } from "../ui/card";
import { useI18n } from "../../lib/i18n-context";

export type LegalContentItem =
  | { type: "paragraph"; key: string; content: React.ReactNode }
  | { type: "interactive"; key: string; component: React.ReactNode }
  | { type: "list"; key: string; items: React.ReactNode[] };

export interface LegalSection {
  title: string;
  items?: LegalContentItem[];
  paragraphs?: React.ReactNode[];
  bullets?: React.ReactNode[];
  interactiveControl?: React.ReactNode;
}

function SectionList({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((section, index) => (
        <section
          key={section.title || `section-${index}`}
          style={{ marginTop: index === 0 ? 0 : 28 }}
        >
          <h2
            style={{
              margin: 0,
              color: "#18181B",
              fontSize: "1.25rem",
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {section.title}
          </h2>

          {/* Explicit structured content items */}
          {section.items?.map((item, itemIndex) => {
            if (item.type === "paragraph") {
              return (
                <p
                  key={item.key || `item-p-${itemIndex}`}
                  style={{ margin: "10px 0 0" }}
                >
                  {item.content}
                </p>
              );
            }
            if (item.type === "interactive") {
              return (
                <div
                  key={item.key || `item-interactive-${itemIndex}`}
                  style={{ margin: "16px 0" }}
                >
                  {item.component}
                </div>
              );
            }
            if (item.type === "list") {
              return (
                <ul
                  key={item.key || `item-list-${itemIndex}`}
                  style={{ margin: "10px 0 0", paddingLeft: 22 }}
                >
                  {item.items.map((bullet, bulletIndex) => (
                    <li
                      key={`${item.key || itemIndex}-bullet-${bulletIndex}`}
                      style={{ marginTop: 6 }}
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              );
            }
            return null;
          })}

          {/* Standard text paragraphs (strictly inside <p>) */}
          {section.paragraphs?.map((paragraph, paragraphIndex) => (
            <p
              key={`paragraph-${paragraphIndex}`}
              style={{ margin: "10px 0 0" }}
            >
              {paragraph}
            </p>
          ))}

          {/* Dedicated interactive control (rendered outside <p>) */}
          {section.interactiveControl ? (
            <div key="interactive-control" style={{ margin: "16px 0" }}>
              {section.interactiveControl}
            </div>
          ) : null}

          {/* Bullets */}
          {section.bullets?.length ? (
            <ul
              key="section-bullets"
              style={{ margin: "10px 0 0", paddingLeft: 22 }}
            >
              {section.bullets.map((bullet, bulletIndex) => (
                <li key={`bullet-${bulletIndex}`} style={{ marginTop: 6 }}>
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
}

function cleanDualSections(sections: LegalSection[]): LegalSection[] {
  return sections.map((sec) => {
    let modified = false;
    let newItems = sec.items;
    let newInteractiveControl = sec.interactiveControl;
    let newParagraphs = sec.paragraphs;

    if (sec.items?.some((item) => item.type === "interactive")) {
      modified = true;
      newItems = sec.items.map((item) => {
        if (item.type === "interactive") {
          return {
            type: "paragraph" as const,
            key: `${item.key}-dual-ref`,
            content: (
              <span
                style={{
                  display: "block",
                  fontStyle: "italic",
                  color: "#71717A",
                  margin: "10px 0",
                }}
              >
                (Sila rujuk kawalan keutamaan analitik yang dipaparkan dalam
                versi bahasa di atas / Please refer to the analytics preferences
                control shown above)
              </span>
            ),
          };
        }
        return item;
      });
    }

    if (sec.interactiveControl) {
      modified = true;
      newInteractiveControl = undefined;
      newParagraphs = [
        ...(sec.paragraphs || []),
        <span
          key="dual-ref"
          style={{
            display: "block",
            fontStyle: "italic",
            color: "#71717A",
            margin: "10px 0",
          }}
        >
          (Sila rujuk kawalan keutamaan analitik yang dipaparkan dalam versi
          bahasa di atas / Please refer to the analytics preferences control
          shown above)
        </span>,
      ];
    }

    if (!modified) return sec;

    return {
      ...sec,
      items: newItems,
      interactiveControl: newInteractiveControl,
      paragraphs: newParagraphs,
    };
  });
}

export interface LegalDocumentProps {
  title: string;
  malayTitle: string;
  chineseTitle?: string;
  effectiveDate: string;
  englishIntro: React.ReactNode;
  malayIntro: React.ReactNode;
  chineseIntro?: React.ReactNode;
  englishSections: LegalSection[];
  malaySections: LegalSection[];
  chineseSections?: LegalSection[];
}

export function LegalDocument({
  title,
  malayTitle,
  chineseTitle,
  effectiveDate,
  englishIntro,
  malayIntro,
  chineseIntro,
  englishSections,
  malaySections,
  chineseSections,
}: LegalDocumentProps) {
  const { locale } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [userViewMode, setUserViewMode] = useState<
    "en" | "ms" | "zh-Hans" | "dual" | null
  >(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Sync with global header locale choice unless user has explicitly overridden view tab
  useEffect(() => {
    setUserViewMode(null);
  }, [locale]);

  const activeView =
    userViewMode ??
    (locale === "ms" ? "ms" : locale === "zh-Hans" ? "zh-Hans" : "en");

  const getTabStyle = (isSelected: boolean): React.CSSProperties => ({
    minHeight: "38px",
    padding: "6px 14px",
    fontSize: "0.8125rem",
    fontWeight: isSelected ? 700 : 500,
    borderRadius: "6px",
    border: isSelected ? "1px solid #18181B" : "1px solid #E4E4E7",
    backgroundColor: isSelected ? "#18181B" : "#FFFFFF",
    color: isSelected ? "#FFFFFF" : "#52525B",
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  // Localized document headings and metadata
  const documentTitle =
    activeView === "ms"
      ? malayTitle
      : activeView === "zh-Hans"
        ? chineseTitle || title
        : title;

  const documentSubtitle =
    activeView === "ms"
      ? title
      : activeView === "zh-Hans"
        ? `${title} • ${malayTitle}`
        : malayTitle;

  const effectiveDateLabel =
    activeView === "ms"
      ? `Tarikh Berkuat Kuasa: ${effectiveDate}`
      : activeView === "zh-Hans"
        ? `生效日期: ${effectiveDate}`
        : activeView === "dual"
          ? `Effective / Berkuat kuasa: ${effectiveDate}`
          : `Effective: ${effectiveDate}`;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <PublicHeader />
      <main
        data-hydrated={hydrated ? "true" : "false"}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 960,
          minWidth: 0,
          margin: "0 auto",
          padding: "48px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              margin: 0,
              color: "#18181B",
              fontSize: "clamp(2rem, 6vw, 2.75rem)",
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            {documentTitle}
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "#52525B",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            {documentSubtitle}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              color: "#52525B",
              fontSize: "0.875rem",
            }}
          >
            {effectiveDateLabel}
          </p>
        </div>

        <nav
          aria-label="Legal policy navigation"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
            fontSize: "0.875rem",
          }}
        >
          {activeView === "ms" ? (
            <>
              <Link href="/privacy">Dasar Privasi</Link>
              <Link href="/terms">Terma Perkhidmatan</Link>
              <Link href="/cookies">Dasar Kuki</Link>
              <Link href="/refunds">Dasar Bayaran Balik</Link>
            </>
          ) : activeView === "zh-Hans" ? (
            <>
              <Link href="/privacy">隐私政策</Link>
              <Link href="/terms">服务条款</Link>
              <Link href="/cookies">Cookie 政策</Link>
              <Link href="/refunds">退款政策</Link>
            </>
          ) : activeView === "dual" ? (
            <>
              <Link href="/privacy">Privacy / Privasi</Link>
              <Link href="/terms">Terms / Terma</Link>
              <Link href="/cookies">Cookies / Kuki</Link>
              <Link href="/refunds">Refunds / Bayaran balik</Link>
            </>
          ) : (
            <>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/cookies">Cookie Policy</Link>
              <Link href="/refunds">Refund Policy</Link>
            </>
          )}
        </nav>

        {/* Document Language View Switcher Tabs */}
        <div
          role="tablist"
          aria-label="Legal document language view"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "en"}
            onClick={() => setUserViewMode("en")}
            style={getTabStyle(activeView === "en")}
          >
            English
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "ms"}
            onClick={() => setUserViewMode("ms")}
            style={getTabStyle(activeView === "ms")}
          >
            Bahasa Melayu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "zh-Hans"}
            onClick={() => setUserViewMode("zh-Hans")}
            style={getTabStyle(activeView === "zh-Hans")}
          >
            简体中文 (待审核草案)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "dual"}
            onClick={() => setUserViewMode("dual")}
            style={getTabStyle(activeView === "dual")}
          >
            Dual View / 双语
          </button>
        </div>

        <Card>
          <CardContent
            style={{
              color: "#3F3F46",
              fontSize: "0.9375rem",
              lineHeight: 1.72,
            }}
          >
            {activeView === "en" && (
              <article lang="en" aria-labelledby="legal-en-title">
                <h2
                  id="legal-en-title"
                  style={{ margin: 0, color: "#18181B", fontSize: "1.4rem" }}
                >
                  English
                </h2>
                <p style={{ margin: "10px 0 22px" }}>{englishIntro}</p>
                <SectionList sections={englishSections} />
              </article>
            )}

            {activeView === "ms" && (
              <article lang="ms" aria-labelledby="legal-ms-title">
                <h2
                  id="legal-ms-title"
                  style={{ margin: 0, color: "#18181B", fontSize: "1.4rem" }}
                >
                  Bahasa Melayu
                </h2>
                <p style={{ margin: "10px 0 22px" }}>{malayIntro}</p>
                <SectionList sections={malaySections} />
              </article>
            )}

            {activeView === "zh-Hans" && (
              <article lang="zh-Hans" aria-labelledby="legal-zh-title">
                <div
                  data-testid="legal-draft-alert"
                  role="alert"
                  style={{
                    backgroundColor: "#FEF3C7",
                    border: "1px solid #F59E0B",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "24px",
                    color: "#92400E",
                    fontSize: "0.875rem",
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      marginBottom: "4px",
                    }}
                  >
                    ⚠️ 法律声明 / Legal Disclaimer: 待所有者及法律顾问审核批准
                    (Pending Owner & Legal Counsel Approval)
                  </div>
                  <div>
                    本简体中文版本翻译仅供所有者审查、参考及便利理解之用，
                    <strong>尚未获得官方法律顾问的正式签署与核准</strong>。
                    根据马来西亚法律规定，具有法律效力、约束力及监管效力的官方文件仅以
                    <strong>英文版（English）</strong>及
                    <strong>马来文版（Bahasa Melayu）</strong>为准。
                    如对条款内容、权利义务或解释存在任何疑问，请以英文版或马来文版为准。
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "0.8125rem",
                      color: "#B45309",
                    }}
                  >
                    (This Simplified Chinese text is an unapproved draft
                    provided for owner review and convenience only. The
                    official, legally binding documents remain the English and
                    Bahasa Melayu versions. For authoritative terms, please
                    switch to English or Bahasa Melayu.)
                  </div>
                </div>

                <h2
                  id="legal-zh-title"
                  style={{ margin: 0, color: "#18181B", fontSize: "1.4rem" }}
                >
                  简体中文 (草案 / Draft for Review)
                </h2>
                <p style={{ margin: "10px 0 22px" }}>
                  {chineseIntro || (
                    <span>
                      {englishIntro}
                      <em
                        style={{
                          display: "block",
                          marginTop: 6,
                          color: "#71717A",
                        }}
                      >
                        (中文导言待审核 / Chinese introductory summary pending
                        review)
                      </em>
                    </span>
                  )}
                </p>
                <SectionList sections={chineseSections || englishSections} />
              </article>
            )}

            {activeView === "dual" && (
              <>
                <article lang="en" aria-labelledby="legal-en-title">
                  <h2
                    id="legal-en-title"
                    style={{ margin: 0, color: "#18181B", fontSize: "1.4rem" }}
                  >
                    English
                  </h2>
                  <p style={{ margin: "10px 0 22px" }}>{englishIntro}</p>
                  <SectionList sections={englishSections} />
                </article>

                <hr
                  aria-hidden="true"
                  style={{
                    margin: "40px 0",
                    border: 0,
                    borderTop: "1px solid #E4E4E7",
                  }}
                />

                <article lang="ms" aria-labelledby="legal-ms-title">
                  <h2
                    id="legal-ms-title"
                    style={{ margin: 0, color: "#18181B", fontSize: "1.4rem" }}
                  >
                    Bahasa Melayu
                  </h2>
                  <p style={{ margin: "10px 0 22px" }}>{malayIntro}</p>
                  <SectionList sections={cleanDualSections(malaySections)} />
                </article>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
