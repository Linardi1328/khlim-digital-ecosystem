"use client";

import Image from "next/image";
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
  const resolvedSize = size ?? height ?? 44;

  return (
    <Image
      src="/khlim-logo.svg"
      alt={t("brand.academy")}
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
