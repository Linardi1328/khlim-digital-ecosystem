"use client";

import Image from "next/image";

export function BrandLogo({
  size,
  height,
  className,
  priority = false,
}: {
  size?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const resolvedSize = size ?? height ?? 44;

  return (
    <Image
      src="/khlim-logo.svg"
      alt="KHLIM Basketball Academy"
      width={resolvedSize}
      height={resolvedSize}
      className={className}
      priority={priority}
      style={{
        width: resolvedSize,
        height: resolvedSize,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
