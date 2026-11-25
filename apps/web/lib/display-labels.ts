import type {
  MembershipStatus,
  PaymentInstallmentRecord,
  PortalNotificationItem,
  ScheduleSessionItem,
} from "./types";

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function membershipStatusLabel(
  status: MembershipStatus | null | undefined,
  t: Translate,
): string {
  switch (status) {
    case "ACTIVE":
      return t("status.active");
    case "PENDING":
      return t("status.pending");
    case "SUSPENDED":
      return t("status.suspended");
    case "CANCELLED":
      return t("status.cancelled");
    case "COMPLETED":
      return t("status.completed");
    case "EXPIRED":
      return t("status.expired");
    default:
      return t("portal.status.none");
  }
}

export function installmentStatusLabel(
  status: PaymentInstallmentRecord["status"],
  t: Translate,
): string {
  switch (status) {
    case "SCHEDULED":
      return t("status.scheduled");
    case "PROCESSING":
      return t("portal.status.processing");
    case "PAID":
      return t("status.paid");
    case "FAILED":
      return t("status.failed");
    case "OVERDUE":
      return t("portal.status.overdue");
    case "WAIVED":
      return t("portal.status.waived");
    case "CANCELLED":
      return t("status.cancelled");
  }
}

export function sessionStatusLabel(
  status: ScheduleSessionItem["status"],
  t: Translate,
): string {
  switch (status) {
    case "SCHEDULED":
      return t("status.scheduled");
    case "COMPLETED":
      return t("status.completed");
    case "CANCELLED":
      return t("status.cancelled");
  }
}

export function attendanceStatusLabel(
  status: ScheduleSessionItem["attendances"][number]["status"],
  t: Translate,
): string {
  switch (status) {
    case "PRESENT":
      return t("portal.status.present");
    case "ABSENT":
      return t("portal.status.absent");
    case "EXCUSED":
      return t("portal.status.excused");
    case "LATE":
      return t("portal.status.late");
  }
}

export function notificationTypeLabel(
  type: PortalNotificationItem["type"],
  t: Translate,
): string {
  switch (type) {
    case "ANNOUNCEMENT":
      return t("portal.notifications.type.announcement");
    case "SCHEDULE_CHANGE":
      return t("portal.notifications.type.scheduleChange");
    case "BILLING":
      return t("portal.notifications.type.billing");
    case "EDITORIAL":
      return t("portal.notifications.type.editorial");
    case "SYSTEM":
      return t("portal.notifications.type.system");
  }
}

export function programmeLevelLabel(
  level: string | null | undefined,
  t: Translate,
): string {
  if (!level) return t("programmes.openDevelopment");
  const normalized = level.trim().toLowerCase();
  const key = `programmes.level.${normalized}`;
  const translated = t(key);
  return translated === key ? level : translated;
}

export function commerceBusinessFieldLabel(
  field: string,
  t: Translate,
): string {
  switch (field) {
    case "company registration number":
      return t("compliance.businessField.registrationNumber");
    case "principal business address":
      return t("compliance.businessField.businessAddress");
    case "business email":
      return t("compliance.businessField.email");
    case "business telephone number":
      return t("compliance.businessField.phone");
    default:
      return field;
  }
}
