"use client";

import Image from "next/image";

export function BrandLogo({
  height = 38,
  className,
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const width = Math.round(height * 2);

  return (
    <Image
      src="/khlim-logo.svg"
      alt="KHLIM"
      width={width}
      height={height}
      className={className}
      priority={priority}
      style={{
        width,
        height,
        objectFit: "contain",
        borderRadius: Math.max(6, Math.round(height * 0.18)),
        flexShrink: 0,
      }}
    />
  );
}
