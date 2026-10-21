/** Legal identity confirmed by KHLIM for public-facing company disclosures. */
export const KHLIM_LEGAL_NAME = "KHLIM Basketball Sdn. Bhd.";
export const KHLIM_REGISTRATION_NUMBER = "1277329-U";

export interface PublicBusinessDetails {
  legalName: string;
  registrationNumber: string;
  businessAddress: string;
  email: string;
  phone: string;
}

function readPublicEnv(name: string): string {
  switch (name) {
    case "NEXT_PUBLIC_BUSINESS_ADDRESS":
      return process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() ?? "";
    case "NEXT_PUBLIC_BUSINESS_EMAIL":
      return process.env.NEXT_PUBLIC_BUSINESS_EMAIL?.trim() ?? "";
    case "NEXT_PUBLIC_BUSINESS_PHONE":
      return process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() ?? "";
    default:
      return "";
  }
}

export function getPublicBusinessDetails(): PublicBusinessDetails {
  return {
    legalName: KHLIM_LEGAL_NAME,
    registrationNumber: KHLIM_REGISTRATION_NUMBER,
    businessAddress: readPublicEnv("NEXT_PUBLIC_BUSINESS_ADDRESS"),
    email:
      readPublicEnv("NEXT_PUBLIC_BUSINESS_EMAIL") ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
      "",
    phone: readPublicEnv("NEXT_PUBLIC_BUSINESS_PHONE"),
  };
}

/** Present the registered company as one consistent name-and-number unit. */
export function formatRegisteredBusinessName(
  details: PublicBusinessDetails = getPublicBusinessDetails(),
): string {
  return details.registrationNumber
    ? `${details.legalName} (${details.registrationNumber})`
    : details.legalName;
}

export function getMissingCommerceBusinessFields(
  details: PublicBusinessDetails = getPublicBusinessDetails(),
): string[] {
  const missing: string[] = [];
  if (!details.registrationNumber) missing.push("company registration number");
  if (!details.businessAddress) missing.push("principal business address");
  if (!details.email) missing.push("business email");
  if (!details.phone) missing.push("business telephone number");
  return missing;
}

export function isCommerceBusinessDetailsComplete(
  details: PublicBusinessDetails = getPublicBusinessDetails(),
): boolean {
  return getMissingCommerceBusinessFields(details).length === 0;
}
