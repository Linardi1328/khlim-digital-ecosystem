import React from "react";
import Link from "next/link";
import { PublicFooter } from "../layout/public-footer";
import { PublicHeader } from "../layout/public-header";
import { Card, CardContent } from "../ui/card";

export interface LegalSection {
  title: string;
  paragraphs?: React.ReactNode[];
  bullets?: React.ReactNode[];
}

function SectionList({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((section, index) => (
        <section key={section.title} style={{ marginTop: index === 0 ? 0 : 28 }}>
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
          {section.paragraphs?.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} style={{ margin: "10px 0 0" }}>
              {paragraph}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul style={{ margin: "10px 0 0", paddingLeft: 22 }}>
              {section.bullets.map((bullet, bulletIndex) => (
                <li key={bulletIndex} style={{ marginTop: 6 }}>
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

export function LegalDocument({
  title,
  malayTitle,
  effectiveDate,
  englishIntro,
  malayIntro,
  englishSections,
  malaySections,
}: {
  title: string;
  malayTitle: string;
  effectiveDate: string;
  englishIntro: React.ReactNode;
  malayIntro: React.ReactNode;
  englishSections: LegalSection[];
  malaySections: LegalSection[];
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main
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
            {title}
          </h1>
          <p style={{ margin: "8px 0 0", color: "#52525B", fontWeight: 600 }}>
            {malayTitle}
          </p>
          <p style={{ margin: "8px 0 0", color: "#52525B", fontSize: "0.875rem" }}>
            Effective / Berkuat kuasa: {effectiveDate}
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
          <Link href="/privacy">Privacy / Privasi</Link>
          <Link href="/terms">Terms / Terma</Link>
          <Link href="/cookies">Cookies / Kuki</Link>
          <Link href="/refunds">Refunds / Bayaran balik</Link>
        </nav>

        <Card>
          <CardContent
            style={{
              color: "#3F3F46",
              fontSize: "0.9375rem",
              lineHeight: 1.72,
            }}
          >
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
              style={{ margin: "40px 0", border: 0, borderTop: "1px solid #E4E4E7" }}
            />

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
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
