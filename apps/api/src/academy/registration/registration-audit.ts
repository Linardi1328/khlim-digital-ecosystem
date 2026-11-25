import type { AuthenticatedUserContext } from "../../auth/authenticated-user";

interface AuditWriter {
  auditEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

/**
 * Appends an audit event. Metadata must contain identifiers, codes and counts
 * only; callers never pass names, phone numbers, dates of birth or free text.
 */
export async function writeRegistrationAudit(
  tx: AuditWriter,
  organizationId: string,
  actor: AuthenticatedUserContext,
  event: {
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await tx.auditEvent.create({
    data: {
      organizationId,
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRoles: actor.roles.join(", ") || "STAFF",
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      summary: event.summary,
      metadata: event.metadata ?? {},
    },
  });
}
