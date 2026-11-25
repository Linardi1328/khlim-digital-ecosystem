import { ForbiddenException } from "@nestjs/common";

const featureFlags = {
  paidEnrolment: "KHLIM_ENABLE_V1_PAID_ENROLMENT",
  parentPortal: "KHLIM_ENABLE_V1_PARENT_PORTAL",
} as const;

export function requireCustomerFeature(feature: keyof typeof featureFlags) {
  if (process.env[featureFlags[feature]] !== "1") {
    throw new ForbiddenException({
      statusCode: 403,
      code: "CUSTOMER_FEATURE_DISABLED",
      message: "This customer feature is not available",
    });
  }
}
