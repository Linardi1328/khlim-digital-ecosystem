import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "KHLIM",
  description: "KHLIM Digital Sports Ecosystem",
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
          background: "#fafafa",
          color: "#151515",
        }}
      >
        {children}
      </body>
    </html>
  );
}
