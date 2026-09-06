from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"Expected pattern not found in {path}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))


schema = "prisma/schema.prisma"
replace_once(
    schema,
    "  notifications      Notification[]\n  auditEvents        AuditEvent[]",
    "  notifications      Notification[]\n"
    "  billingProfiles    BillingProfile[]\n"
    "  paymentMethods     PaymentMethod[]\n"
    "  payments           Payment[]\n"
    "  paymentProviderEvents PaymentProviderEvent[]\n"
    "  auditEvents        AuditEvent[]",
)

replace_once(
    schema,
    '''model BillingProfile {
  id                 String               @id @default(uuid()) @db.Uuid
  userId             String               @map("user_id") @db.Uuid
  provider           String
  providerCustomerId String               @map("provider_customer_id")
  status             BillingProfileStatus @default(ACTIVE)
  createdAt          DateTime             @default(now()) @map("created_at")
  updatedAt          DateTime             @updatedAt @map("updated_at")
  user               User                 @relation(fields: [userId], references: [id], onDelete: Restrict)
  paymentMethods     PaymentMethod[]

  @@unique([userId, provider])
  @@unique([provider, providerCustomerId])
  @@index([status])
  @@map("billing_profiles")
}''',
    '''model BillingProfile {
  id                 String               @id @default(uuid()) @db.Uuid
  organizationId     String               @map("organization_id") @db.Uuid
  userId             String               @map("user_id") @db.Uuid
  provider           String
  providerCustomerId String               @map("provider_customer_id")
  status             BillingProfileStatus @default(ACTIVE)
  createdAt          DateTime             @default(now()) @map("created_at")
  updatedAt          DateTime             @updatedAt @map("updated_at")
  organization       Organization         @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  user               User                 @relation(fields: [userId], references: [id], onDelete: Restrict)
  paymentMethods     PaymentMethod[]

  @@unique([organizationId, userId, provider])
  @@unique([provider, providerCustomerId])
  @@index([organizationId, status])
  @@map("billing_profiles")
}''',
)

replace_once(
    schema,
    '''model PaymentMethod {
  id                             String              @id @default(uuid()) @db.Uuid
  billingProfileId               String              @map("billing_profile_id") @db.Uuid
  provider                       String
  providerPaymentMethodReference String              @map("provider_payment_method_reference")
  methodType                     String              @map("method_type")
  brand                          String?
  lastFour                       String?              @map("last_four")
  expiryMonth                    Int?                 @map("expiry_month")
  expiryYear                     Int?                 @map("expiry_year")
  status                         PaymentMethodStatus @default(ACTIVE)
  createdAt                      DateTime             @default(now()) @map("created_at")
  updatedAt                      DateTime             @updatedAt @map("updated_at")
  billingProfile                 BillingProfile      @relation(fields: [billingProfileId], references: [id], onDelete: Cascade)

  @@unique([provider, providerPaymentMethodReference])
  @@index([billingProfileId, status])
  @@map("payment_methods")
}''',
    '''model PaymentMethod {
  id                             String              @id @default(uuid()) @db.Uuid
  organizationId                 String              @map("organization_id") @db.Uuid
  billingProfileId               String              @map("billing_profile_id") @db.Uuid
  provider                       String
  providerPaymentMethodReference String              @map("provider_payment_method_reference")
  methodType                     String              @map("method_type")
  brand                          String?
  lastFour                       String?              @map("last_four")
  expiryMonth                    Int?                 @map("expiry_month")
  expiryYear                     Int?                 @map("expiry_year")
  status                         PaymentMethodStatus @default(ACTIVE)
  createdAt                      DateTime             @default(now()) @map("created_at")
  updatedAt                      DateTime             @updatedAt @map("updated_at")
  organization                   Organization         @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  billingProfile                 BillingProfile      @relation(fields: [billingProfileId], references: [id], onDelete: Cascade)

  @@unique([provider, providerPaymentMethodReference])
  @@index([organizationId, billingProfileId, status])
  @@map("payment_methods")
}''',
)

replace_once(
    schema,
    '''model Payment {
  id                   String              @id @default(uuid()) @db.Uuid
  payerUserId          String              @map("payer_user_id") @db.Uuid''',
    '''model Payment {
  id                   String              @id @default(uuid()) @db.Uuid
  organizationId       String              @map("organization_id") @db.Uuid
  payerUserId          String              @map("payer_user_id") @db.Uuid''',
)
replace_once(
    schema,
    '''  updatedAt            DateTime            @updatedAt @map("updated_at")
  payer                User                @relation("PaymentPayer", fields: [payerUserId], references: [id], onDelete: Restrict)''',
    '''  updatedAt            DateTime            @updatedAt @map("updated_at")
  organization         Organization        @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  payer                User                @relation("PaymentPayer", fields: [payerUserId], references: [id], onDelete: Restrict)''',
)
replace_once(
    schema,
    '''  @@unique([provider, providerPaymentId])
  @@index([membershipId, status])
  @@index([paymentInstallmentId, status])
  @@map("payments")''',
    '''  @@unique([provider, providerPaymentId])
  @@index([organizationId, membershipId, status])
  @@index([organizationId, paymentInstallmentId, status])
  @@index([organizationId, status, attemptedAt])
  @@map("payments")''',
)

replace_once(
    schema,
    '''model PaymentProviderEvent {
  id               String                               @id @default(uuid()) @db.Uuid
  provider         String''',
    '''model PaymentProviderEvent {
  id               String                               @id @default(uuid()) @db.Uuid
  organizationId   String                               @map("organization_id") @db.Uuid
  provider         String''',
)
replace_once(
    schema,
    '''  payloadHash      String                               @map("payload_hash")
  safeMetadata     Json?                                @map("safe_metadata")

  @@unique([provider, providerEventId])
  @@index([processingStatus, receivedAt])''',
    '''  payloadHash      String                               @map("payload_hash")
  safeMetadata     Json?                                @map("safe_metadata")
  organization     Organization                         @relation(fields: [organizationId], references: [id], onDelete: Restrict)

  @@unique([provider, providerEventId])
  @@index([organizationId, processingStatus, receivedAt])''',
)

prisma_service = "apps/api/src/database/prisma.service.ts"
replace_once(
    prisma_service,
    '  "notification",\n]);',
    '  "notification",\n'
    '  "billingprofile",\n'
    '  "paymentmethod",\n'
    '  "payment",\n'
    '  "paymentproviderevent",\n'
    ']);',
)

billing = Path("apps/api/src/billing/billing.service.ts")
text = billing.read_text()
text = text.replace(
    '''            organizationId_provider_providerEventId: {
              organizationId,
              provider: gateway.provider,
              providerEventId: event.providerEventId,
            },''',
    '''            provider_providerEventId: {
              provider: gateway.provider,
              providerEventId: event.providerEventId,
            },''',
)
text = text.replace(
    '''      if (!existing) {
        throw error;
      }

      if (
        existing.payloadHash !== payloadHash ||''',
    '''      if (!existing) {
        throw error;
      }

      if (existing.organizationId !== organizationId) {
        throw new ConflictException(
          "Provider event already belongs to a different organization",
        );
      }

      if (
        existing.payloadHash !== payloadHash ||''',
)
text = text.replace(
    '''          organizationId_provider_providerEventId: {
            organizationId,
            provider,
            providerEventId: event.providerEventId,
          },''',
    '''          provider_providerEventId: {
            provider,
            providerEventId: event.providerEventId,
          },''',
)
text = text.replace(
    '''    return this.prisma.client.paymentProviderEvent.update({
      where: {
        organizationId_provider_providerEventId: {
          organizationId,
          provider,
          providerEventId,
        },
      },
      data: { processingStatus, processedAt: new Date() },
    });''',
    '''    return this.prisma.client.paymentProviderEvent
      .update({
        where: { provider_providerEventId: { provider, providerEventId } },
        data: { processingStatus, processedAt: new Date() },
      })
      .then((event) => {
        if (event.organizationId !== organizationId) {
          throw new ConflictException(
            "Provider event belongs to a different organization",
          );
        }
        return event;
      });''',
)
billing.write_text(text)
