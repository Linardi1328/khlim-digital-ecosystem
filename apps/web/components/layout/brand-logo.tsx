"use client";

import Image from "next/image";

export function BrandLogo({
  size = 44,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/khlim-logo.svg"
      alt="KHLIM Basketball Academy"
      width={size}
      height={size}
      className={className}
      priority={priority}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
