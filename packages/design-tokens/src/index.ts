export const colors = {
  brand: {
    primary: "#F59E0B",
    primaryHover: "#D97706",
    primaryLight: "#FEF3C7",
    primaryDark: "#B45309",
    secondary: "#E11D48",
    secondaryHover: "#BE123C",
    secondaryLight: "#FFE4E6",
    charcoal: "#121212",
    obsidian: "#18181B",
    navy: "#0F172A",
    white: "#FFFFFF",
    black: "#000000",
  },
  neutral: {
    50: "#FAFAFA",
    100: "#F4F4F5",
    200: "#E4E4E7",
    300: "#D4D4D8",
    400: "#A1A1AA",
    500: "#71717A",
    600: "#52525B",
    700: "#3F3F46",
    800: "#27272A",
    900: "#18181B",
    950: "#09090B",
  },
  semantic: {
    success: {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      text: "#065F46",
      main: "#10B981",
    },
    warning: {
      bg: "#FFFBEB",
      border: "#FDE68A",
      text: "#92400E",
      main: "#F59E0B",
    },
    danger: {
      bg: "#FEF2F2",
      border: "#FECACA",
      text: "#991B1B",
      main: "#EF4444",
    },
    info: {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      text: "#1E40AF",
      main: "#3B82F6",
    },
  },
} as const;

export const typography = {
  fontSans:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans SC", "Noto Sans TC", "Noto Sans Devanagari", sans-serif',
  fontMono:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  sizes: {
    xs: { fontSize: "0.75rem", lineHeight: "1rem" },
    sm: { fontSize: "0.875rem", lineHeight: "1.25rem" },
    base: { fontSize: "1rem", lineHeight: "1.5rem" },
    lg: { fontSize: "1.125rem", lineHeight: "1.75rem" },
    xl: { fontSize: "1.25rem", lineHeight: "1.75rem" },
    "2xl": { fontSize: "1.5rem", lineHeight: "2rem" },
    "3xl": { fontSize: "1.875rem", lineHeight: "2.25rem" },
    "4xl": { fontSize: "2.25rem", lineHeight: "2.5rem" },
    "5xl": { fontSize: "3rem", lineHeight: "1" },
  },
} as const;

export const radii = {
  none: "0",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

export const spacing = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;
