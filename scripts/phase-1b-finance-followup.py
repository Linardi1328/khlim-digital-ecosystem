from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"Expected pattern not found in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1))


replace_once(
    "tests/organization-phase-1b.test.mjs",
    r'''  assert.match(service, /data: \{\n\s+organizationId,\n\s+payerUserId,/);''',
    r'''  assert.match(service, /create: \{\n\s+organizationId,\n\s+payerUserId,/);''',
)

replace_once(
    "apps/api/src/billing/billing.service.ts",
    '''  async reconcileStaleCheckoutHolds(
    organizationIdOrNow: string | Date = DEFAULT_ORGANIZATION_ID,
    maybeNow?: Date,
  ) {
    const organizationId =
      typeof organizationIdOrNow === "string"
        ? organizationIdOrNow
        : compatibilityOrganizationId();
    const now =
      typeof organizationIdOrNow === "string"
        ? (maybeNow ?? new Date())
        : organizationIdOrNow;''',
    '''  async reconcileStaleCheckoutHolds(
    organizationIdOrNow?: string | Date,
    maybeNow?: Date,
  ) {
    const organizationId =
      typeof organizationIdOrNow === "string"
        ? organizationIdOrNow
        : compatibilityOrganizationId();
    const now =
      typeof organizationIdOrNow === "string"
        ? (maybeNow ?? new Date())
        : (organizationIdOrNow ?? new Date());''',
)

replace_once(
    "apps/api/src/billing/billing.service.ts",
    '''    const customer = await gateway.createCustomer({
      khlimUserId: userId,
      email,
      idempotencyKey: `billing-profile:${organizationId}:${userId}`,
    });''',
    '''    const customer = await gateway.createCustomer({
      organizationId,
      khlimUserId: userId,
      email,
      idempotencyKey: `billing-profile:${organizationId}:${userId}`,
    });''',
)

replace_once(
    "apps/api/src/billing/payment-gateway.ts",
    '''export interface CreateGatewayCustomerInput {
  khlimUserId: string;''',
    '''export interface CreateGatewayCustomerInput {
  organizationId: string;
  khlimUserId: string;''',
)

replace_once(
    "apps/api/src/billing/billplz-payment-gateway.ts",
    '''      providerCustomerId: `khlim-user:${input.khlimUserId}`,''',
    '''      providerCustomerId: `khlim-org:${input.organizationId}:user:${input.khlimUserId}`,''',
)

replace_once(
    "tests/integration/pre-alpha-billplz-sandbox.test.mjs",
    '''  const customer = await adapter.createCustomer({
    khlimUserId: "70000000-0000-4000-8000-000000000010",
    email: "guardian@example.test",
    idempotencyKey: "billing-profile:guardian",
  });
  assert.equal(
    customer.providerCustomerId,
    "khlim-user:70000000-0000-4000-8000-000000000010",
  );''',
    '''  const customer = await adapter.createCustomer({
    organizationId: "00000000-0000-4000-8000-000000000001",
    khlimUserId: "70000000-0000-4000-8000-000000000010",
    email: "guardian@example.test",
    idempotencyKey: "billing-profile:guardian",
  });
  assert.equal(
    customer.providerCustomerId,
    "khlim-org:00000000-0000-4000-8000-000000000001:user:70000000-0000-4000-8000-000000000010",
  );''',
)
