import "../../../packages/design-tokens/src/tokens.css";
import "./globals.css";
import "./home-academy.css";
import "./editorial.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "../components/providers";

export const metadata: Metadata = {
  title: "KHLIM — Digital Sports Ecosystem",
  description:
    "Official KHLIM Basketball Academy public website and member platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'var(--khlim-font-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
          background: "#fafafa",
          color: "#18181b",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
