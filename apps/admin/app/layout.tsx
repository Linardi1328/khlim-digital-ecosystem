import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "KHLIM Admin",
  description: "KHLIM staff operations console",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial, sans-serif",
          background: "#111",
          color: "#f5f5f5",
        }}
      >
        {children}
      </body>
    </html>
  );
}
