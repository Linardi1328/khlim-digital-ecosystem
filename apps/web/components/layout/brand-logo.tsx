"use client";

import { useState } from "react";

const LOGO_ASPECT_RATIO = 256 / 301;
const LOGO_ALT = "KHLIM Sports Academy";
const LOGO_FALLBACK = "KHS";

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
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedHeight = size ?? height ?? 48;
  const resolvedWidth = Math.round(resolvedHeight * LOGO_ASPECT_RATIO);

  if (imageFailed) {
    return (
      <span
        role="img"
        aria-label={LOGO_ALT}
        className={className}
        style={{
          width: resolvedWidth,
          height: resolvedHeight,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          backgroundColor: "#14234D",
          border: "1px solid #F5A623",
          color: "#FFFFFF",
          fontSize: Math.max(10, Math.round(resolvedHeight * 0.22)),
          fontWeight: 900,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {LOGO_FALLBACK}
      </span>
    );
  }

  return (
    <img
      src="/khs-academy-logo.webp"
      alt={LOGO_ALT}
      width={resolvedWidth}
      height={resolvedHeight}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setImageFailed(true)}
      style={{
        display: "block",
        width: resolvedWidth,
        height: resolvedHeight,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
