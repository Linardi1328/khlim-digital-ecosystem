"use client";

import { useState } from "react";
import { useI18n } from "../../lib/i18n-context";

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
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedSize = size ?? height ?? 44;
  const alt = t("brand.academy");

  if (imageFailed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={className}
        style={{
          width: resolvedSize,
          height: resolvedSize,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          backgroundColor: "#18181B",
          border: "1px solid #F59E0B",
          color: "#F59E0B",
          fontSize: Math.max(12, Math.round(resolvedSize * 0.34)),
          fontWeight: 800,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        K
      </span>
    );
  }

  return (
    <img
      src="/khlim-logo.jpg"
      alt={alt}
      width={resolvedSize}
      height={resolvedSize}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setImageFailed(true)}
      style={{
        display: "block",
        width: resolvedSize,
        height: resolvedSize,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
