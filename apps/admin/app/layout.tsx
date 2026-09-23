import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AdminProviders } from "../components/providers";

export const metadata: Metadata = {
  title: "KHLIM Admin Operations Console",
  description: "KHLIM Digital Sports Ecosystem Operations & Management",
  icons: {
    icon: "/khs-academy-logo.webp",
    apple: "/khs-academy-logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
