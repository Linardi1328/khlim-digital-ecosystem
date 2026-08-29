"use client";

import Image from "next/image";

export function BrandLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/khlim-logo.svg"
      alt="KHLIM"
      width={size}
      height={size}
      className={className}
      priority
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: Math.max(6, Math.round(size * 0.18)),
        flexShrink: 0,
      }}
    />
  );
}
