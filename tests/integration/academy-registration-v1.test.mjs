import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import {
  AppModule,
  HMAC_V1,
  HMAC_V2,
  NestFactory,
  ORG_A,
  ORG_B,
  PrismaService,
  RUN,
  RegistrationPublicService,
  SupabaseJwtService,
  UnauthorizedException,
  addDays,
  captureOutput,
  databaseTestsEnabled,
  expectDbReject,
  http,
  klToday,
  newIp,
  newKey,
  nextPhone,
  nextSaturday,
  policyContent,
  scrubRegistrationEvent,
  shiftYears,
} from "./academy-registration-v1.helpers.mjs";

const enabled = databaseTestsEnabled();
const skip = enabled
  ? false
  : "Set KHLIM_TEST_DATABASE=1 to run database tests";

process.env.KHLIM_REGISTRATION_HMAC_KEYS = `v1:${HMAC_V1}`;

const POLICY_V1 = `synthetic-ric190-${RUN}-v1`;
const POLICY_V2 = `synthetic-ric190-${RUN}-v2`;
const PLAYER_TAG = `SynPlayer${RUN}`;
const GUARDIAN_TAG = `SynGuardian${RUN}`;
let currentConsent = POLICY_V1;

const USERS = {
  admin: { role: "ACADEMY_ADMIN", aal: "aal2" },
  adminAal1: { role: "ACADEMY_ADMIN", aal: "aal1", sameAs: "admin" },
  mgmt: { role: "MANAGEMENT", aal: "aal2" },
  coach: { role: "COACH", aal: "aal2" },
  finance: { role: "FINANCE_ADMIN", aal: "aal2" },
  event: { role: "EVENT_STAFF", aal: "aal2" },
  suspended: { role: "ACADEMY_ADMIN", aal: "aal2", status: "SUSPENDED" },
  inactiveMember: {
    role: "ACADEMY_ADMIN",
    aal: "aal2",
    membership: "SUSPENDED",
  },
  foreign: { role: "ACADEMY_ADMIN", aal: "aal2", org: ORG_B },
};

let ctxPromise;
let output;

async function buildContext() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("v1");
  app.getHttpAdapter().getInstance().set("trust proxy", true);
  const prisma = app.get(PrismaService);
  const client = prisma.client;

  const identities = new Map();
  const ids = {};
  for (const [name, spec] of Object.entries(USERS)) {
    const base = spec.sameAs ?? name;
    ids[base] ??= randomUUID();
    const subject = `ric190-${RUN}-${base}`;
    identities.set(name, {
      subject,
      email: `${base}.${RUN}@example.test`.toLowerCase(),
      payload: { sub: subject, aal: spec.aal, aud: "authenticated" },
    });
  }
  app.get(SupabaseJwtService).verify = async (token) => {
    const identity = identities.get(token);
    if (!identity) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return identity;
  };

  // Make re-runs against the same disposable database independent of earlier runs.
  await client.$executeRawUnsafe(
    `UPDATE academy_registration_sessions SET publication_state = 'CLOSED', closed_at = now() WHERE publication_state = 'PUBLISHED'`,
  );
  await client.$executeRawUnsafe(
    `UPDATE academy_registration_policies SET status = 'RETIRED', retired_at = now() WHERE status = 'APPROVED'`,
  );

  await client.organization.create({
    data: {
      id: ORG_B,
      slug: `ric190-b-${RUN.toLowerCase()}`,
      name: "Synthetic Org B",
    },
  });
  for (const [name, spec] of Object.entries(USERS)) {
    if (spec.sameAs) continue;
    const user = await client.user.create({
      data: {
        id: ids[name],
        authProviderSubject: identities.get(name).subject,
        email: identities.get(name).email,
        status: spec.status ?? "ACTIVE",
      },
    });
    await client.organizationMembership.create({
      data: {
        organizationId: spec.org ?? ORG_A,
        userId: user.id,
        status: spec.membership ?? "ACTIVE",
        roleAssignments: { create: [{ role: spec.role }] },
      },
    });
  }

  const sport = await client.sport.upsert({
    where: { code: "SYNTHETIC_RIC190" },
    create: { code: "SYNTHETIC_RIC190", defaultName: "Synthetic Sport" },
    update: {},
  });
  for (const organizationId of [ORG_A, ORG_B]) {
    await client.organizationSport.upsert({
      where: { organizationId_sportId: { organizationId, sportId: sport.id } },
      create: { organizationId, sportId: sport.id },
      update: {},
    });
  }
  const programmeA = await client.programme.create({
    data: {
      organizationId: ORG_A,
      sportId: sport.id,
      code: `SYN-A-${RUN}`,
      name: "Synthetic Cohort 10-12",
      minimumAge: 10,
      maximumAge: 12,
    },
  });
  const programmeB = await client.programme.create({
    data: {
      organizationId: ORG_B,
      sportId: sport.id,
      code: `SYN-B-${RUN}`,
      name: "Synthetic Org B Programme",
      minimumAge: 10,
      maximumAge: 12,
    },
  });
  const venueA = await client.venue.create({
    data: {
      organizationId: ORG_A,
      name: "Synthetic Venue A",
      address: "1 Synthetic Road",
    },
  });
  const venueB = await client.venue.create({
    data: { organizationId: ORG_B, name: "Synthetic Venue B" },
  });

  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  output = captureOutput();
  return {
    app,
    client,
    baseUrl,
    ids,
    programmeA,
    programmeB,
    venueA,
    venueB,
  };
}

function ctx() {
  ctxPromise ??= buildContext();
  return ctxPromise;
}

after(async () => {
  output?.restore();
  if (!ctxPromise) return;
  const c = await ctxPromise;
  await c.app.close();
});

const FIRST_DATE = nextSaturday(8);

function api(c, path, opts = {}) {
  return http(c.baseUrl, `/v1${path}`, opts);
}

async function setSession(c, overrides = {}) {
  const created = await api(c, "/admin/academy/registration-sessions", {
    method: "POST",
    token: "admin",
    body: {
      programmeId: c.programmeA.id,
      venueId: c.venueA.id,
      name: `Synthetic ${RUN} ${randomUUID().slice(0, 6)}`,
      capacity: 10,
      coachDisplayName: "Synthetic Coach",
      weekday: 6,
      startTime: "14:00",
      endTime: "16:00",
      firstSessionDate: FIRST_DATE,
      recurrence: "WEEKLY",
      ageReferenceRule: "SESSION_START_DATE",
      ...overrides,
    },
  });
  assert.equal(created.status, 201, created.text);
  return created.body;
}

async function publishedSession(c, overrides = {}) {
  const draft = await setSession(c, overrides);
  const published = await api(
    c,
    `/admin/academy/registration-sessions/${draft.id}/publish`,
    {
      method: "POST",
      token: "admin",
      body: {
        expectedVersion: draft.version,
        approvals: { scheduleApproved: true, ageRuleApproved: true },
      },
    },
  );
  assert.equal(published.status, 201, published.text);
  return published.body;
}

function regBody(sessionId, overrides = {}) {
  return {
    sessionId,
    locale: "en",
    consentVersion: currentConsent,
    player: {
      fullName: `${PLAYER_TAG} ${randomUUID().slice(0, 4)}`,
      dateOfBirth: shiftYears(FIRST_DATE, -11),
      gender: "MALE",
      jerseySize: "YM",
      phone: null,
    },
    guardian: {
      fullName: `${GUARDIAN_TAG} One`,
      phone: nextPhone(),
      relationship: "MOTHER",
      authorityConfirmed: true,
    },
    emergencyContact: {
      fullName: `${GUARDIAN_TAG} Contact`,
      phone: nextPhone(),
      relationship: "GRANDPARENT",
    },
    consents: {
      registrationPrivacy: true,
      marketing: false,
      photography: false,
    },
    ...overrides,
  };
}

function submit(c, body, opts = {}) {
  return api(c, "/academy/registrations", {
    method: "POST",
    body,
    key: opts.key ?? newKey(),
    ip: opts.ip,
    signal: opts.signal,
  });
}

async function createRegistration(c, sessionId, overrides = {}) {
  const res = await submit(c, regBody(sessionId, overrides));
  assert.equal(res.status, 201, res.text);
  return res.body;
}

function setStatus(
  c,
  id,
  status,
  expectedVersion,
  extra = {},
  token = "admin",
) {
  return api(c, `/admin/academy/registrations/${id}/status`, {
    method: "PATCH",
    token,
    body: { status, expectedVersion, ...extra },
  });
}

async function approvePolicy(c, label) {
  const created = await api(c, "/admin/academy/registration-policies", {
    method: "POST",
    token: "mgmt",
    body: { policyVersion: label, content: policyContent(label) },
  });
  assert.equal(created.status, 201, created.text);
  const approved = await api(
    c,
    `/admin/academy/registration-policies/${created.body.id}/approve`,
    {
      method: "POST",
      token: "mgmt",
      body: { expectedVersion: created.body.version },
    },
  );
  assert.equal(approved.status, 201, approved.text);
  return approved.body;
}

test(
  "registration stays closed without an approved consent policy",
  { skip },
  async () => {
    const c = await ctx();
    const config = await api(c, "/academy/registration-config");
    assert.equal(config.status, 200);
    assert.equal(config.body.registrationOpen, false);
    assert.equal(config.body.closedReasonCode, "REGISTRATION_NOT_CONFIGURED");
    assert.equal(config.body.consent, null);

    const sessions = await api(c, "/academy/sessions");
    assert.deepEqual(sessions.body, { registrationOpen: false, items: [] });
    const res = await submit(c, regBody(randomUUID()));
    assert.equal(res.status, 409);
    assert.equal(res.body.code, "REGISTRATION_CLOSED");

    // Publishing is also refused without an approved policy.
    const draft = await setSession(c);
    const refused = await api(
      c,
      `/admin/academy/registration-sessions/${draft.id}/publish`,
      {
        method: "POST",
        token: "admin",
        body: {
          expectedVersion: draft.version,
          approvals: { scheduleApproved: true, ageRuleApproved: true },
        },
      },
    );
    assert.equal(refused.status, 409);
    assert.equal(refused.body.code, "SESSION_INCOMPLETE");
    assert.ok(
      refused.body.fieldErrors.some((e) => e.field === "consentPolicy"),
    );

    // Only SUPER_ADMIN/MANAGEMENT may approve policy versions.
    const policy = await api(c, "/admin/academy/registration-policies", {
      method: "POST",
      token: "admin",
      body: { policyVersion: POLICY_V1, content: policyContent(POLICY_V1) },
    });
    assert.equal(policy.status, 201, policy.text);
    const denied = await api(
      c,
      `/admin/academy/registration-policies/${policy.body.id}/approve`,
      { method: "POST", token: "admin", body: { expectedVersion: 1 } },
    );
    assert.equal(denied.status, 403);
    const approved = await api(
      c,
      `/admin/academy/registration-policies/${policy.body.id}/approve`,
      { method: "POST", token: "mgmt", body: { expectedVersion: 1 } },
    );
    assert.equal(approved.status, 201, approved.text);
    assert.equal(approved.body.status, "APPROVED");
    const row = await c.client.academyRegistrationPolicy.findUnique({
      where: { id: policy.body.id },
    });
    assert.equal(
      row.approvedByUserId,
      c.ids.mgmt,
      "approver comes from the authenticated user",
    );

    const open = await api(c, "/academy/registration-config");
    assert.equal(open.body.registrationOpen, true);
    assert.equal(open.body.consent.policyVersion, POLICY_V1);
    assert.deepEqual(
      open.body.consent.items.map((i) => [
        i.type,
        i.required,
        i.defaultChecked,
      ]),
      [
        ["GUARDIAN_AUTHORITY", true, false],
        ["REGISTRATION_PRIVACY", true, false],
        ["MARKETING", false, false],
        ["PHOTOGRAPHY", false, false],
      ],
    );
    // A draft session is still not bookable.
    const listed = await api(c, "/academy/sessions");
    assert.ok(!listed.body.items.some((i) => i.id === draft.id));
  },
);

test(
  "published sessions are exposed only when complete, open and approved; the database rejects incomplete published rows",
  { skip },
  async () => {
    const c = await ctx();
    const incomplete = await api(c, "/admin/academy/registration-sessions", {
      method: "POST",
      token: "admin",
      body: {
        programmeId: c.programmeA.id,
        venueId: c.venueA.id,
        name: `Incomplete ${RUN}`,
        capacity: 5,
      },
    });
    assert.equal(incomplete.status, 201);
    const refused = await api(
      c,
      `/admin/academy/registration-sessions/${incomplete.body.id}/publish`,
      {
        method: "POST",
        token: "admin",
        body: {
          expectedVersion: 1,
          approvals: { scheduleApproved: true, ageRuleApproved: true },
        },
      },
    );
    assert.equal(refused.status, 409);
    assert.equal(refused.body.code, "SESSION_INCOMPLETE");
    for (const field of [
      "coachDisplayName",
      "weekday",
      "startTime",
      "endTime",
      "firstSessionDate",
      "recurrence",
      "ageReferenceRule",
    ]) {
      assert.ok(
        refused.body.fieldErrors.some((e) => e.field === field),
        `missing ${field}`,
      );
    }
    const noApproval = await api(
      c,
      `/admin/academy/registration-sessions/${incomplete.body.id}/publish`,
      {
        method: "POST",
        token: "admin",
        body: {
          expectedVersion: 1,
          approvals: { scheduleApproved: true, ageRuleApproved: false },
        },
      },
    );
    assert.equal(noApproval.status, 400);

    // SQL UNKNOWN cannot sneak an incomplete row past the CHECK.
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registration_sessions SET publication_state = 'PUBLISHED', published_at = now(), published_by_user_id = '${c.ids.admin}' WHERE id = '${incomplete.body.id}'`,
        ),
      /published_complete/,
    );
    const good = await publishedSession(c);
    for (const column of [
      "weekday",
      "start_time",
      "end_time",
      "first_session_date",
      "recurrence",
      "age_reference_rule",
      "coach_display_name",
    ]) {
      await expectDbReject(
        () =>
          c.client.$executeRawUnsafe(
            `UPDATE academy_registration_sessions SET ${column} = NULL WHERE id = '${good.id}'`,
          ),
        /published_complete|age_reference_consistent/,
      );
    }
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registration_sessions SET start_time = '17:00' WHERE id = '${good.id}'`,
        ),
      /time_order|published_complete/,
    );
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registration_sessions SET weekday = 3 WHERE id = '${good.id}'`,
        ),
      /first_date_weekday/,
    );
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE programme_offerings SET venue_id = NULL WHERE id = '${good.programmeOfferingId}'`,
        ),
      /SESSION_INCOMPLETE/,
    );

    const listed = await api(c, "/academy/sessions");
    assert.equal(listed.status, 200);
    const found = listed.body.items.find((item) => item.id === good.id);
    assert.ok(found);
    assert.equal(found.venue.name, "Synthetic Venue A");
    assert.equal(found.weekday, 6);
    assert.equal(found.startTime, "14:00");
    assert.equal(found.minAge, 10);
    assert.equal(found.maxAge, 12);
    assert.equal(found.timezone, "Asia/Kuala_Lumpur");
    assert.equal(found.firstSessionDate, FIRST_DATE);
    assert.ok(
      !listed.body.items.some((item) => item.id === incomplete.body.id),
    );
    for (const forbidden of [
      "capacity",
      "price",
      "seatsRemaining",
      "confirmed",
    ]) {
      assert.ok(!(forbidden in found), `${forbidden} must not be public`);
    }

    const blocked = await api(
      c,
      `/admin/academy/registration-sessions/${good.id}`,
      {
        method: "PATCH",
        token: "admin",
        body: { expectedVersion: good.version, startTime: "15:00" },
      },
    );
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, "SESSION_NOT_EDITABLE");

    // A legacy status change can only reduce availability.
    await c.client.programmeOffering.update({
      where: { id: good.programmeOfferingId },
      data: { status: "INACTIVE" },
    });
    assert.ok(
      !(await api(c, "/academy/sessions")).body.items.some(
        (i) => i.id === good.id,
      ),
    );
    await c.client.programmeOffering.update({
      where: { id: good.programmeOfferingId },
      data: {
        status: "OPEN",
        enrollmentClosesAt: new Date(Date.now() - 60_000),
      },
    });
    assert.ok(
      !(await api(c, "/academy/sessions")).body.items.some(
        (i) => i.id === good.id,
      ),
    );
    await c.client.programmeOffering.update({
      where: { id: good.programmeOfferingId },
      data: { enrollmentClosesAt: null },
    });
    const draft = await setSession(c);
    await c.client.programmeOffering.update({
      where: { id: draft.programmeOfferingId },
      data: { status: "OPEN" },
    });
    assert.ok(
      !(await api(c, "/academy/sessions")).body.items.some(
        (i) => i.id === draft.id,
      ),
      "legacy OPEN on a draft cohort does not make it bookable",
    );
  },
);

test(
  "valid registration returns a minimal non-PII receipt and persists authoritative data",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const body = regBody(session.id, {
      source: "3x3-oct24",
      consents: {
        registrationPrivacy: true,
        marketing: true,
        photography: false,
      },
    });
    const key = newKey();
    const res = await submit(c, body, { key });
    assert.equal(res.status, 201, res.text);
    assert.deepEqual(Object.keys(res.body).sort(), [
      "id",
      "messageCode",
      "receivedAt",
      "referenceCode",
      "reservesPlace",
      "session",
      "status",
    ]);
    assert.equal(res.body.status, "RECEIVED");
    assert.equal(res.body.reservesPlace, false);
    assert.equal(res.body.messageCode, "REGISTRATION_RECEIVED_PENDING_REVIEW");
    assert.match(res.body.referenceCode, /^KAR-[0-9A-HJKMNP-TV-Z]{8}$/);
    for (const secret of [
      PLAYER_TAG,
      GUARDIAN_TAG,
      body.guardian.phone,
      body.player.dateOfBirth,
    ]) {
      assert.ok(!res.text.includes(secret), `receipt leaked ${secret}`);
    }
    const row = await c.client.academyRegistration.findUnique({
      where: { id: res.body.id },
      include: { consents: true },
    });
    assert.equal(row.status, "RECEIVED");
    assert.equal(row.organizationId, ORG_A);
    assert.equal(row.ageAtReference, 11);
    assert.equal(row.source, "3x3-oct24");
    assert.equal(row.guardianPhone, body.guardian.phone);
    assert.equal(row.idempotencyKeyHmac.length, 64);
    assert.notEqual(row.idempotencyKeyHmac, key);
    assert.equal(row.hmacKeyVersion, "v1");
    const byType = Object.fromEntries(
      row.consents.map((x) => [x.consentType, x]),
    );
    assert.equal(byType.GUARDIAN_AUTHORITY.granted, true);
    assert.equal(byType.REGISTRATION_PRIVACY.granted, true);
    assert.equal(byType.MARKETING.granted, true);
    assert.equal(byType.PHOTOGRAPHY.granted, false);
    assert.equal(byType.MARKETING.policyVersion, POLICY_V1);
    assert.equal(byType.MARKETING.locale, "en");
    assert.match(byType.MARKETING.contentSha256, /^[0-9a-f]{64}$/);
    assert.equal(byType.MARKETING.withdrawnAt, null);
    const sessionAdmin = await api(
      c,
      `/admin/academy/registration-sessions/${session.id}`,
      { token: "admin" },
    );
    assert.equal(sessionAdmin.body.seatCounts.RECEIVED, 1);
    assert.equal(
      sessionAdmin.body.seatsRemaining,
      10,
      "initial submission never reserves a seat",
    );
    for (const path of [
      `/academy/registrations/${res.body.id}`,
      `/academy/registrations?id=${res.body.id}`,
    ]) {
      const lookup = await api(c, path);
      assert.ok(
        [404, 405].includes(lookup.status),
        `${path} -> ${lookup.status}`,
      );
    }
  },
);

test(
  "validation: required fields, nested allowlists, forged fields, consent booleans",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const fields = (res) =>
      res.body.fieldErrors.map((e) => `${e.field}:${e.code}`);

    const missing = await submit(c, {});
    assert.equal(missing.status, 400);
    assert.equal(missing.body.code, "VALIDATION_FAILED");
    assert.ok(fields(missing).includes("sessionId:REQUIRED"));

    const base = regBody(session.id);
    const forged = await submit(c, {
      ...base,
      status: "CONFIRMED",
      price: 0,
      age: 11,
      organizationId: ORG_B,
      role: "SUPER_ADMIN",
      player: { ...base.player, ageAtReference: 11, id: randomUUID() },
      guardian: { ...base.guardian, isAdmin: true },
      consents: { ...base.consents, guardianAuthority: true },
    });
    assert.equal(forged.status, 400);
    for (const expected of [
      "status:UNKNOWN_FIELD",
      "price:UNKNOWN_FIELD",
      "age:UNKNOWN_FIELD",
      "organizationId:UNKNOWN_FIELD",
      "role:UNKNOWN_FIELD",
      "player.ageAtReference:UNKNOWN_FIELD",
      "player.id:UNKNOWN_FIELD",
      "guardian.isAdmin:UNKNOWN_FIELD",
      "consents.guardianAuthority:UNKNOWN_FIELD",
    ]) {
      assert.ok(
        fields(forged).includes(expected),
        `${expected} in ${fields(forged)}`,
      );
    }
    assert.equal(
      await c.client.academyRegistration.count({
        where: { sessionId: session.id },
      }),
      0,
    );

    const cases = [
      [
        { guardian: { ...base.guardian, authorityConfirmed: false } },
        "guardian.authorityConfirmed:MUST_BE_TRUE",
      ],
      [
        {
          consents: {
            registrationPrivacy: false,
            marketing: false,
            photography: false,
          },
        },
        "consents.registrationPrivacy:MUST_BE_TRUE",
      ],
      [
        { consents: { registrationPrivacy: true } },
        "consents.marketing:REQUIRED",
      ],
      [
        {
          consents: {
            registrationPrivacy: true,
            marketing: "yes",
            photography: false,
          },
        },
        "consents.marketing:INVALID_TYPE",
      ],
      [
        { player: { ...base.player, dateOfBirth: addDays(klToday(), 400) } },
        "player.dateOfBirth:DATE_IN_FUTURE",
      ],
      [
        { player: { ...base.player, dateOfBirth: "2015-02-30" } },
        "player.dateOfBirth:INVALID_DATE",
      ],
      [
        { player: { ...base.player, gender: "OTHER" } },
        "player.gender:INVALID_VALUE",
      ],
      [
        { player: { ...base.player, jerseySize: "XXL" } },
        "player.jerseySize:INVALID_VALUE",
      ],
      [
        { player: { ...base.player, fullName: "A" } },
        "player.fullName:TOO_SHORT",
      ],
      [
        { guardian: { ...base.guardian, phone: "12" } },
        "guardian.phone:INVALID_PHONE",
      ],
      [
        { emergencyContact: { fullName: "Syn Contact" } },
        "emergencyContact.phone:REQUIRED",
      ],
      [{ locale: "fr" }, "locale:INVALID_VALUE"],
      [{ sessionId: "not-a-uuid" }, "sessionId:INVALID_FORMAT"],
      [{ player: "nope" }, "player:INVALID_TYPE"],
    ];
    for (const [override, expected] of cases) {
      const res = await submit(c, { ...base, ...override });
      assert.equal(res.status, 400, expected);
      assert.ok(
        fields(res).includes(expected),
        `${expected} in ${fields(res)}`,
      );
    }

    const noKey = await api(c, "/academy/registrations", {
      method: "POST",
      body: base,
    });
    assert.equal(noKey.body.code, "IDEMPOTENCY_KEY_REQUIRED");
    const shortKey = await submit(c, base, { key: "short" });
    assert.equal(shortKey.status, 400);
    assert.equal(shortKey.body.code, "IDEMPOTENCY_KEY_INVALID");
    const oddKey = await submit(c, base, { key: "a@b c".repeat(6) });
    assert.equal(oddKey.body.code, "IDEMPOTENCY_KEY_INVALID");
    assert.equal(
      await c.client.academyRegistration.count({
        where: { sessionId: session.id },
      }),
      0,
    );

    const withPhone = await submit(c, {
      ...base,
      player: { ...base.player, phone: "013-5551234" },
    });
    assert.equal(withPhone.status, 201, withPhone.text);
  },
);

test(
  "age eligibility uses the configured rule and boundaries; forged age is ignored",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const dobBody = (sessionId, d) =>
      regBody(sessionId, {
        player: { ...regBody(sessionId).player, dateOfBirth: d },
      });
    const cases = [
      [shiftYears(FIRST_DATE, -10), 201],
      [addDays(shiftYears(FIRST_DATE, -10), 1), 422],
      [addDays(shiftYears(FIRST_DATE, -13), 1), 201],
      [shiftYears(FIRST_DATE, -13), 422],
    ];
    for (const [d, status] of cases) {
      const res = await submit(c, dobBody(session.id, d));
      assert.equal(res.status, status, `${d}: ${res.text}`);
      if (status === 422) {
        assert.equal(res.body.code, "PLAYER_AGE_INELIGIBLE");
        assert.deepEqual(res.body.details, { minAge: 10, maxAge: 12 });
      }
    }
    // FIXED_DATE: an explicit approved reference date, not calendar-year arithmetic.
    const fixedRef = addDays(FIRST_DATE, 30);
    const fixed = await publishedSession(c, {
      ageReferenceRule: "FIXED_DATE",
      ageReferenceDate: fixedRef,
    });
    const turns13 = shiftYears(fixedRef, -13);
    assert.equal(
      (await submit(c, dobBody(fixed.id, addDays(turns13, -1)))).status,
      422,
    );
    const ok = await submit(c, dobBody(fixed.id, addDays(turns13, 1)));
    assert.equal(ok.status, 201);
    const stored = await c.client.academyRegistration.findUnique({
      where: { id: ok.body.id },
    });
    assert.equal(stored.ageAtReference, 12);
    assert.equal(
      stored.ageReferenceDateUsed.toISOString().slice(0, 10),
      fixedRef,
    );
    // REGISTRATION_DATE: server "today" in Asia/Kuala_Lumpur.
    const today = await publishedSession(c, {
      ageReferenceRule: "REGISTRATION_DATE",
    });
    const t = await submit(c, dobBody(today.id, shiftYears(klToday(), -11)));
    assert.equal(t.status, 201, t.text);
    // The reference rule must be consistent before it can be saved.
    const badRule = await api(c, "/admin/academy/registration-sessions", {
      method: "POST",
      token: "admin",
      body: {
        programmeId: c.programmeA.id,
        venueId: c.venueA.id,
        name: "x",
        capacity: 5,
        ageReferenceRule: "FIXED_DATE",
      },
    });
    assert.equal(badRule.status, 400);
    assert.deepEqual(badRule.body.fieldErrors, [
      { field: "ageReferenceDate", code: "REQUIRED" },
    ]);
  },
);

test(
  "idempotency: replay, conflict, concurrency, interruption, and replay after state, consent, key and session changes",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const body = regBody(session.id);
    const key = newKey();
    const first = await submit(c, body, { key });
    assert.equal(first.status, 201);
    const replay = await submit(c, body, { key });
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body, first.body);

    const reordered = {
      consents: body.consents,
      player: { ...body.player, fullName: `  ${body.player.fullName}  ` },
      guardian: body.guardian,
      emergencyContact: body.emergencyContact,
      consentVersion: body.consentVersion,
      locale: body.locale,
      sessionId: body.sessionId,
    };
    assert.equal((await submit(c, reordered, { key })).status, 200);

    const conflict = await submit(
      c,
      { ...body, player: { ...body.player, jerseySize: "YL" } },
      { key },
    );
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "IDEMPOTENCY_KEY_CONFLICT");
    assert.equal(
      await c.client.academyRegistration.count({
        where: { id: first.body.id },
      }),
      1,
    );

    // Concurrent identical requests produce one durable registration.
    const concurrentKey = newKey();
    const concurrentBody = regBody(session.id);
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        submit(c, concurrentBody, { key: concurrentKey }),
      ),
    );
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.ok(results.every((r) => r.status === 201 || r.status === 200));
    assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
    assert.equal(new Set(results.map((r) => r.body.referenceCode)).size, 1);
    assert.equal(
      await c.client.academyRegistration.count({
        where: { guardianPhone: concurrentBody.guardian.phone },
      }),
      1,
    );

    // The client drops the connection mid-request; the retry is safe.
    const abortKey = newKey();
    const abortBody = regBody(session.id);
    const controller = new AbortController();
    const inflight = submit(c, abortBody, {
      key: abortKey,
      signal: controller.signal,
    }).catch(() => null);
    controller.abort();
    await inflight;
    const retried = await submit(c, abortBody, { key: abortKey });
    assert.ok([200, 201].includes(retried.status));
    assert.equal(
      await c.client.academyRegistration.count({
        where: { guardianPhone: abortBody.guardian.phone },
      }),
      1,
    );

    // Status change does not alter the original receipt.
    const status = await setStatus(c, first.body.id, "UNDER_REVIEW", 1);
    assert.equal(status.status, 200, status.text);
    const afterStatus = await submit(c, body, { key });
    assert.equal(afterStatus.status, 200);
    assert.deepEqual(afterStatus.body, first.body);
    assert.equal(afterStatus.body.status, "RECEIVED");

    // Consent rotation: replay still works; new submissions need the new version.
    const v2 = await approvePolicy(c, POLICY_V2);
    assert.equal(v2.status, "APPROVED");
    currentConsent = POLICY_V2;
    const config = await api(c, "/academy/registration-config");
    assert.equal(config.body.consent.policyVersion, POLICY_V2);
    const afterRotation = await submit(c, body, { key });
    assert.equal(afterRotation.status, 200);
    assert.deepEqual(afterRotation.body, first.body);
    const stale = await submit(
      c,
      regBody(session.id, { consentVersion: POLICY_V1 }),
    );
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "CONSENT_VERSION_MISMATCH");
    assert.equal(stale.body.details.currentConsentVersion, POLICY_V2);
    const fresh = await submit(c, regBody(session.id, { locale: "zh-Hans" }));
    assert.equal(fresh.status, 201, fresh.text);
    const freshConsents = await c.client.academyRegistrationConsent.findMany({
      where: { registrationId: fresh.body.id },
    });
    assert.ok(
      freshConsents.every(
        (x) => x.policyVersion === POLICY_V2 && x.locale === "zh-Hans",
      ),
    );
    const retired = await c.client.academyRegistrationPolicy.findFirst({
      where: { organizationId: ORG_A, policyVersion: POLICY_V1 },
    });
    assert.equal(retired.status, "RETIRED");

    // Session closure does not break an identical retry.
    const closed = await api(
      c,
      `/admin/academy/registration-sessions/${session.id}/close`,
      {
        method: "POST",
        token: "admin",
        body: { expectedVersion: session.version },
      },
    );
    assert.equal(closed.status, 201, closed.text);
    const afterClosure = await submit(c, body, { key });
    assert.equal(afterClosure.status, 200);
    assert.deepEqual(afterClosure.body, first.body);
    assert.equal(
      (await submit(c, regBody(session.id))).body.code,
      "SESSION_NOT_AVAILABLE",
    );

    // HMAC key rotation keeps old receipts replayable.
    process.env.KHLIM_REGISTRATION_HMAC_KEYS = `v2:${HMAC_V2},v1:${HMAC_V1}`;
    try {
      const afterKeyRotation = await submit(c, body, { key });
      assert.equal(afterKeyRotation.status, 200);
      assert.deepEqual(afterKeyRotation.body, first.body);
      const open = await publishedSession(c);
      const newRecord = await submit(c, regBody(open.id));
      assert.equal(newRecord.status, 201, newRecord.text);
      const stored = await c.client.academyRegistration.findUnique({
        where: { id: newRecord.body.id },
      });
      assert.equal(stored.hmacKeyVersion, "v2");
    } finally {
      process.env.KHLIM_REGISTRATION_HMAC_KEYS = `v1:${HMAC_V1}`;
    }

    // No key ring: registration fails closed.
    delete process.env.KHLIM_REGISTRATION_HMAC_KEYS;
    try {
      const closedConfig = await api(c, "/academy/registration-config");
      assert.equal(closedConfig.body.registrationOpen, false);
      assert.equal(
        (await submit(c, regBody(session.id))).body.code,
        "REGISTRATION_CLOSED",
      );
      assert.deepEqual((await api(c, "/academy/sessions")).body.items, []);
    } finally {
      process.env.KHLIM_REGISTRATION_HMAC_KEYS = `v1:${HMAC_V1}`;
    }
  },
);

test(
  "a failed transaction never returns a receipt; the same key then succeeds",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const body = regBody(session.id);
    const key = newKey();
    await c.client.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION ric190_sim_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SIMULATED_FAILURE ${PLAYER_TAG}'; END $$`,
    );
    await c.client.$executeRawUnsafe(
      `CREATE TRIGGER ric190_sim_fail BEFORE INSERT ON academy_registration_consents FOR EACH ROW EXECUTE FUNCTION ric190_sim_fail()`,
    );
    let res;
    try {
      res = await submit(c, body, { key });
    } finally {
      await c.client.$executeRawUnsafe(
        `DROP TRIGGER ric190_sim_fail ON academy_registration_consents`,
      );
      await c.client.$executeRawUnsafe(`DROP FUNCTION ric190_sim_fail()`);
    }
    assert.equal(res.status, 503);
    assert.equal(res.body.code, "REGISTRATION_PERSISTENCE_FAILED");
    assert.equal(res.headers.get("retry-after"), "30");
    assert.ok(
      !res.text.includes(PLAYER_TAG) && !res.text.includes("SIMULATED"),
      "no raw database text reaches the client",
    );
    assert.equal(
      await c.client.academyRegistration.count({
        where: { guardianPhone: body.guardian.phone },
      }),
      0,
    );
    const retry = await submit(c, body, { key });
    assert.equal(retry.status, 201, retry.text);
    assert.equal(
      await c.client.academyRegistration.count({
        where: { guardianPhone: body.guardian.phone },
      }),
      1,
    );
  },
);

test(
  "rate limiting is namespaced, has no phone-only lockout, fails closed and cleans up in bounded batches",
  { skip },
  async () => {
    const c = await ctx();
    const ghost = randomUUID();
    const attempt = (phone, address) =>
      submit(
        c,
        regBody(ghost, {
          guardian: { ...regBody(ghost).guardian, phone },
        }),
        { ip: address },
      );
    const ip = newIp();
    const ipResults = [];
    for (let i = 0; i < 21; i += 1)
      ipResults.push(await attempt(nextPhone(), ip));
    assert.ok(
      ipResults
        .slice(0, 20)
        .every((r) => r.body.code === "SESSION_NOT_AVAILABLE"),
    );
    assert.equal(ipResults[20].status, 429);
    assert.equal(ipResults[20].body.code, "RATE_LIMITED");
    assert.equal(ipResults[20].headers.get("retry-after"), "600");
    assert.equal(ipResults[20].body.retryAfter, 600);

    const victimPhone = nextPhone();
    const pairIp = newIp();
    const pair = [];
    for (let i = 0; i < 4; i += 1)
      pair.push(await attempt(victimPhone, pairIp));
    assert.equal(pair[3].status, 429);
    assert.equal(pair[3].headers.get("retry-after"), "3600");
    const otherNetwork = await attempt(victimPhone, newIp());
    assert.equal(
      otherNetwork.status,
      409,
      "a third party cannot lock a victim's number out",
    );
    const keys = await c.client.submissionRateLimit.findMany({
      where: { key: { startsWith: "reg:" } },
      select: { key: true },
    });
    assert.ok(
      keys.length > 0 &&
        keys.every(
          (k) =>
            !k.key.includes(ip) &&
            !k.key.includes(victimPhone) &&
            k.key.length <= 128,
        ),
    );

    // Storage failure fails closed with Retry-After and no registration.
    const session = await publishedSession(c);
    const before = await c.client.academyRegistration.count();
    await c.client.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION ric190_rl_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'RL_DOWN'; END $$`,
    );
    await c.client.$executeRawUnsafe(
      `CREATE TRIGGER ric190_rl_fail BEFORE INSERT ON submission_rate_limits FOR EACH ROW EXECUTE FUNCTION ric190_rl_fail()`,
    );
    let down;
    try {
      down = await submit(c, regBody(session.id), { ip: newIp() });
    } finally {
      await c.client.$executeRawUnsafe(
        `DROP TRIGGER ric190_rl_fail ON submission_rate_limits`,
      );
      await c.client.$executeRawUnsafe(`DROP FUNCTION ric190_rl_fail()`);
    }
    assert.equal(down.status, 503);
    assert.equal(down.body.code, "SERVICE_TEMPORARILY_UNAVAILABLE");
    assert.equal(down.headers.get("retry-after"), "30");
    assert.equal(await c.client.academyRegistration.count(), before);

    // Cleanup removes only expired reg: rows, at most 500 per batch.
    const past = new Date(Date.now() - 3_600_000);
    await c.client.submissionRateLimit.createMany({
      data: [
        ...Array.from({ length: 600 }, (_, i) => ({
          key: `reg:expired:${RUN}:${i}`,
          expiresAt: past,
        })),
        { key: `lead:expired:${RUN}`, expiresAt: past },
        { key: `reg:live:${RUN}`, expiresAt: new Date(Date.now() + 3_600_000) },
      ],
    });
    const service = c.app.get(RegistrationPublicService);
    const first = await service.cleanupExpiredRateLimits();
    assert.equal(first, 500);
    let total = first;
    for (;;) {
      const n = await service.cleanupExpiredRateLimits();
      assert.ok(n <= 500);
      total += n;
      if (n === 0) break;
    }
    assert.ok(total >= 600);
    assert.ok(
      await c.client.submissionRateLimit.findUnique({
        where: { key: `lead:expired:${RUN}` },
      }),
      "lead counters are untouched",
    );
    assert.ok(
      await c.client.submissionRateLimit.findUnique({
        where: { key: `reg:live:${RUN}` },
      }),
    );
    await c.client.submissionRateLimit.deleteMany({
      where: { key: { in: [`lead:expired:${RUN}`, `reg:live:${RUN}`] } },
    });
  },
);

test(
  "campaign source attribution is restored and sanitized",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const expectations = [
      ["3x3-oct24", "3x3-oct24"],
      ["summer_2026", "summer_2026"],
      ["0123456789", null],
      ["60123456789", null],
      ["unattributed", null],
      ["guardian@example.test", null],
      ["x".repeat(65), null],
      ["bad value!", null],
      [undefined, null],
    ];
    for (const [source, expected] of expectations) {
      const res = await submit(
        c,
        regBody(session.id, source === undefined ? {} : { source }),
      );
      assert.equal(res.status, 201, res.text);
      const row = await c.client.academyRegistration.findUnique({
        where: { id: res.body.id },
      });
      assert.equal(row.source, expected, String(source));
    }
  },
);

test(
  "admin access matrix: unauthenticated, AAL1, wrong role, suspended, inactive membership, cross-tenant, forged organization",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const reg = await createRegistration(c, session.id);
    const paths = [
      ["GET", "/admin/academy/registrations"],
      ["GET", `/admin/academy/registrations/${reg.id}`],
      ["POST", "/admin/academy/registrations/search", { q: "Syn" }],
      [
        "PATCH",
        `/admin/academy/registrations/${reg.id}/status`,
        { status: "UNDER_REVIEW", expectedVersion: 1 },
      ],
      ["GET", "/admin/academy/registration-sessions"],
      ["GET", "/admin/academy/registration-policies"],
    ];
    const expected = {
      none: 401,
      adminAal1: 403,
      coach: 403,
      finance: 403,
      event: 403,
      suspended: 403,
      inactiveMember: 403,
      foreign: 403,
    };
    for (const [method, path, body] of paths) {
      for (const [token, status] of Object.entries(expected)) {
        const res = await api(c, path, {
          method,
          body,
          token: token === "none" ? undefined : token,
        });
        assert.equal(res.status, status, `${method} ${path} as ${token}`);
      }
    }
    assert.equal(
      (await c.client.academyRegistration.findUnique({ where: { id: reg.id } }))
        .status,
      "RECEIVED",
    );

    const foreignSlug = `ric190-b-${RUN.toLowerCase()}`;
    const forgedHeader = await api(c, "/admin/academy/registrations", {
      token: "admin",
      headers: { "x-khlim-organization": foreignSlug },
    });
    assert.equal(forgedHeader.status, 403);
    const foreignOwnOrg = await api(
      c,
      `/admin/academy/registrations/${reg.id}`,
      {
        token: "foreign",
        headers: { "x-khlim-organization": foreignSlug },
      },
    );
    assert.equal(foreignOwnOrg.status, 403);

    const forgedBody = await api(c, "/admin/academy/registration-sessions", {
      method: "POST",
      token: "admin",
      body: {
        programmeId: c.programmeA.id,
        venueId: c.venueA.id,
        name: "x",
        capacity: 5,
        organizationId: ORG_B,
        roles: ["SUPER_ADMIN"],
      },
    });
    assert.equal(forgedBody.status, 400);
    assert.ok(
      forgedBody.body.fieldErrors.some(
        (e) => e.field === "organizationId" && e.code === "UNKNOWN_FIELD",
      ),
    );
    const crossProgramme = await api(
      c,
      "/admin/academy/registration-sessions",
      {
        method: "POST",
        token: "admin",
        body: {
          programmeId: c.programmeB.id,
          venueId: c.venueA.id,
          name: "x",
          capacity: 5,
        },
      },
    );
    assert.equal(crossProgramme.status, 404);
    assert.equal(crossProgramme.body.code, "PROGRAMME_NOT_FOUND");
    const crossVenue = await api(c, "/admin/academy/registration-sessions", {
      method: "POST",
      token: "admin",
      body: {
        programmeId: c.programmeA.id,
        venueId: c.venueB.id,
        name: "x",
        capacity: 5,
      },
    });
    assert.equal(crossVenue.body.code, "VENUE_NOT_FOUND");

    // IDOR/BOLA: Org B objects are invisible to Org A staff.
    const offeringB = await c.client.programmeOffering.create({
      data: {
        organizationId: ORG_B,
        programmeId: c.programmeB.id,
        venueId: c.venueB.id,
        name: `B ${RUN}`,
        capacity: 5,
      },
    });
    const sessionB = await c.client.academyRegistrationSession.create({
      data: { organizationId: ORG_B, programmeOfferingId: offeringB.id },
    });
    const policyB = await c.client.academyRegistrationPolicy.create({
      data: {
        organizationId: ORG_B,
        policyVersion: `synthetic-b-${RUN}`,
        content: {},
      },
    });
    const regB = await c.client.academyRegistration.create({
      data: {
        referenceCode: `KAR-${RUN}`,
        organizationId: ORG_B,
        sessionId: sessionB.id,
        sessionNameSnapshot: "B",
        playerFullName: "Syn B Player",
        playerDateOfBirth: new Date("2015-01-01"),
        ageAtReference: 11,
        ageReferenceDateUsed: new Date("2026-12-12"),
        playerGender: "MALE",
        playerJerseySize: "YM",
        guardianFullName: "Syn B Guardian",
        guardianPhone: "+60121110000",
        guardianRelationship: "MOTHER",
        guardianAuthorityConfirmed: true,
        emergencyContactName: "Syn B Contact",
        emergencyContactPhone: "+60121110001",
        emergencyContactRelationship: "FRIEND",
        idempotencyKeyHmac: "a".repeat(64),
        payloadHmac: "b".repeat(64),
        hmacKeyVersion: "v1",
      },
    });
    for (const [method, path, body] of [
      ["GET", `/admin/academy/registrations/${regB.id}`],
      [
        "PATCH",
        `/admin/academy/registrations/${regB.id}/status`,
        { status: "UNDER_REVIEW", expectedVersion: 1 },
      ],
      ["GET", `/admin/academy/registration-sessions/${sessionB.id}`],
      [
        "PATCH",
        `/admin/academy/registration-sessions/${sessionB.id}`,
        { expectedVersion: 1, capacity: 99 },
      ],
      [
        "POST",
        `/admin/academy/registration-sessions/${sessionB.id}/close`,
        { expectedVersion: 1 },
      ],
      [
        "POST",
        `/admin/academy/registration-policies/${policyB.id}/approve`,
        { expectedVersion: 1 },
      ],
    ]) {
      const res = await api(c, path, { method, body, token: "mgmt" });
      assert.equal(res.status, 404, `${method} ${path} -> ${res.status}`);
    }
    const listed = await api(c, "/admin/academy/registrations?limit=100", {
      token: "admin",
    });
    assert.ok(!listed.body.items.some((item) => item.id === regB.id));
    const search = await api(c, "/admin/academy/registrations/search", {
      method: "POST",
      token: "admin",
      body: { q: "Syn B" },
    });
    assert.equal(search.body.total, 0);
    assert.equal(
      (
        await c.client.academyRegistration.findUnique({
          where: { id: regB.id },
        })
      ).status,
      "RECEIVED",
    );
  },
);

test(
  "database-level tenant isolation rejects cross-tenant sessions, registrations, consents and offerings",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const offeringB = await c.client.programmeOffering.create({
      data: {
        organizationId: ORG_B,
        programmeId: c.programmeB.id,
        venueId: c.venueB.id,
        name: `iso ${RUN}`,
        capacity: 5,
      },
    });
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `INSERT INTO academy_registration_sessions (id, organization_id, programme_offering_id, updated_at) VALUES (gen_random_uuid(), '${ORG_A}', '${offeringB.id}', now())`,
        ),
      /foreign key|violates/i,
    );
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `INSERT INTO academy_registrations (id, reference_code, organization_id, session_id, session_name_snapshot, player_full_name, player_date_of_birth, age_at_reference, age_reference_date_used, player_gender, player_jersey_size, guardian_full_name, guardian_phone, guardian_relationship, guardian_authority_confirmed, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, idempotency_key_hmac, payload_hmac, hmac_key_version, updated_at)
           VALUES (gen_random_uuid(), 'KAR-CCCCCCCC', '${ORG_B}', '${session.id}', 's', 'p', '2015-01-01', 11, '2026-12-12', 'MALE', 'YM', 'g', '+60121110000', 'MOTHER', true, 'e', '+60121110001', 'FRIEND', '${"c".repeat(64)}', '${"d".repeat(64)}', 'v1', now())`,
        ),
      /foreign key|violates/i,
    );
    const registrationA = await createRegistration(c, session.id);
    const policyA = await c.client.academyRegistrationPolicy.findFirst({
      where: { organizationId: ORG_A, status: "APPROVED" },
    });
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `INSERT INTO academy_registration_consents (id, organization_id, registration_id, policy_id, consent_type, granted, policy_version, locale, content_sha256) VALUES (gen_random_uuid(), '${ORG_B}', '${registrationA.id}', '${policyA.id}', 'MARKETING', false, 'v', 'en', '${"e".repeat(64)}')`,
        ),
      /foreign key|violates/i,
    );
    await expectDbReject(
      () =>
        c.client.programmeOffering.create({
          data: {
            organizationId: ORG_A,
            programmeId: c.programmeB.id,
            name: "x",
            capacity: 5,
          },
        }),
      /CROSS_TENANT_REFERENCE/,
    );
    await expectDbReject(
      () =>
        c.client.programmeOffering.create({
          data: {
            organizationId: ORG_A,
            programmeId: c.programmeA.id,
            venueId: c.venueB.id,
            name: "x",
            capacity: 5,
          },
        }),
      /CROSS_TENANT_REFERENCE/,
    );
    await expectDbReject(
      () =>
        c.client.programmeOffering.update({
          where: { id: session.programmeOfferingId },
          data: { venueId: c.venueB.id },
        }),
      /CROSS_TENANT_REFERENCE/,
    );
    await expectDbReject(
      () =>
        c.client.academyRegistrationConsent.update({
          where: {
            registrationId_consentType: {
              registrationId: registrationA.id,
              consentType: "REGISTRATION_PRIVACY",
            },
          },
          data: { granted: false },
        }),
      /required_granted/,
    );
  },
);

test(
  "admin list/search/detail: bounded, no PII in URLs, detail access audited",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const a = await createRegistration(c, session.id);
    await createRegistration(c, session.id);
    const list = await api(
      c,
      `/admin/academy/registrations?sessionId=${session.id}&limit=1&page=1`,
      { token: "admin" },
    );
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.limit, 1);
    assert.equal(list.body.total, 2);
    assert.equal(list.body.totalPages, 2);
    assert.deepEqual(
      Object.keys(list.body.items[0]).sort(),
      [
        "ageAtReference",
        "createdAt",
        "id",
        "playerFullName",
        "referenceCode",
        "sessionId",
        "sessionName",
        "status",
        "updatedAt",
        "version",
      ],
      "list rows carry no guardian PII",
    );

    for (const [query, code] of [
      ["?q=Syn", "SEARCH_NOT_ALLOWED_IN_QUERY"],
      ["?guardianPhone=0123", "UNKNOWN_QUERY_PARAMETER"],
      ["?limit=101", "VALIDATION_FAILED"],
      ["?limit=0", "VALIDATION_FAILED"],
      ["?page=abc", "VALIDATION_FAILED"],
      ["?status=BOGUS", "VALIDATION_FAILED"],
    ]) {
      const res = await api(c, `/admin/academy/registrations${query}`, {
        token: "admin",
      });
      assert.equal(res.status, 400, query);
      assert.equal(res.body.code, code, query);
    }

    const row = await c.client.academyRegistration.findUnique({
      where: { id: a.id },
    });
    const search = await api(c, "/admin/academy/registrations/search", {
      method: "POST",
      token: "admin",
      body: { q: row.playerFullName.slice(0, 12), sessionId: session.id },
    });
    assert.equal(search.status, 201);
    assert.ok(search.body.total >= 1);
    const byRef = await api(c, "/admin/academy/registrations/search", {
      method: "POST",
      token: "admin",
      body: { q: row.referenceCode.toLowerCase() },
    });
    assert.equal(byRef.body.total, 1);
    const byPhone = await api(c, "/admin/academy/registrations/search", {
      method: "POST",
      token: "admin",
      body: { q: row.guardianPhone.replace("+60", "0") },
    });
    assert.ok(byPhone.body.total >= 0);
    for (const body of [{ q: "x" }, { q: "xx", extra: 1 }, {}]) {
      assert.equal(
        (
          await api(c, "/admin/academy/registrations/search", {
            method: "POST",
            token: "admin",
            body,
          })
        ).status,
        400,
      );
    }

    const detail = await api(c, `/admin/academy/registrations/${a.id}`, {
      token: "admin",
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.guardian.phone, row.guardianPhone);
    assert.equal(detail.body.consents.length, 4);
    const audits = await c.client.auditEvent.findMany({
      where: { action: "ACADEMY_REGISTRATION_DETAIL_VIEWED", entityId: a.id },
    });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].organizationId, ORG_A);
    assert.equal(audits[0].actorUserId, c.ids.admin);
    assert.equal(
      (
        await api(c, `/admin/academy/registrations/${randomUUID()}`, {
          token: "admin",
        })
      ).body.code,
      "REGISTRATION_NOT_FOUND",
    );
    assert.equal(
      (
        await api(c, "/admin/academy/registrations/not-a-uuid", {
          token: "admin",
        })
      ).status,
      404,
    );
  },
);

test(
  "status lifecycle: server-enforced transitions, versions, reasons, terminal states, audit",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c, { capacity: 5 });
    const a = await createRegistration(c, session.id);
    const forged = await api(c, `/admin/academy/registrations/${a.id}/status`, {
      method: "PATCH",
      token: "admin",
      body: {
        status: "CONFIRMED",
        expectedVersion: 1,
        organizationId: ORG_B,
        role: "SUPER_ADMIN",
        price: 0,
      },
    });
    assert.equal(forged.status, 400);
    assert.equal(forged.body.code, "VALIDATION_FAILED");
    assert.equal((await setStatus(c, a.id, "RECEIVED", 1)).status, 400);
    assert.equal((await setStatus(c, a.id, "BOGUS", 1)).status, 400);
    const noReason = await setStatus(c, a.id, "REJECTED", 1);
    assert.deepEqual(noReason.body.fieldErrors, [
      { field: "reasonCode", code: "REASON_CODE_REQUIRED" },
    ]);
    assert.equal(
      (await setStatus(c, a.id, "UNDER_REVIEW", 1, { reasonCode: "OTHER" }))
        .status,
      400,
    );
    const stale = await setStatus(c, a.id, "UNDER_REVIEW", 7);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "STALE_VERSION");
    const review = await setStatus(c, a.id, "UNDER_REVIEW", 1);
    assert.equal(review.status, 200);
    assert.equal(review.body.version, 2);
    assert.equal(
      (await setStatus(c, a.id, "UNDER_REVIEW", 2)).body.code,
      "INVALID_TRANSITION",
    );
    const confirmed = await setStatus(c, a.id, "CONFIRMED", 2);
    assert.equal(confirmed.status, 200, confirmed.text);
    assert.equal(confirmed.body.status, "CONFIRMED");
    assert.equal(
      (await setStatus(c, a.id, "REJECTED", 3, { reasonCode: "OTHER" })).body
        .code,
      "INVALID_TRANSITION",
    );
    assert.equal(
      (await setStatus(c, a.id, "UNDER_REVIEW", 3)).body.code,
      "INVALID_TRANSITION",
    );
    let admin = await api(
      c,
      `/admin/academy/registration-sessions/${session.id}`,
      {
        token: "admin",
      },
    );
    assert.equal(admin.body.seatCounts.CONFIRMED, 1);
    assert.equal(admin.body.seatsRemaining, 4);
    const cancelled = await setStatus(c, a.id, "CANCELLED", 3, {
      reasonCode: "GUARDIAN_REQUEST",
    });
    assert.equal(cancelled.status, 200);
    admin = await api(c, `/admin/academy/registration-sessions/${session.id}`, {
      token: "admin",
    });
    assert.equal(admin.body.seatsRemaining, 5, "cancelling releases the seat");
    for (const target of [
      "CONFIRMED",
      "UNDER_REVIEW",
      "REJECTED",
      "CANCELLED",
    ]) {
      const extra = ["REJECTED", "CANCELLED"].includes(target)
        ? { reasonCode: "OTHER" }
        : {};
      const res = await setStatus(c, a.id, target, 4, extra);
      assert.equal(
        res.body.code,
        "INVALID_TRANSITION",
        `terminal -> ${target}`,
      );
    }
    const b = await createRegistration(c, session.id);
    assert.equal(
      (await setStatus(c, b.id, "REJECTED", 1, { reasonCode: "INELIGIBLE" }))
        .status,
      200,
    );
    const d = await createRegistration(c, session.id);
    assert.equal((await setStatus(c, d.id, "CONFIRMED", 1)).status, 200);
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registrations SET status = 'RECEIVED' WHERE id = '${d.id}'`,
        ),
      /INVALID_TRANSITION/,
    );
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registrations SET status = 'REJECTED' WHERE id = '${d.id}'`,
        ),
      /INVALID_TRANSITION/,
    );
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registrations SET status = 'CONFIRMED' WHERE id = '${b.id}'`,
        ),
      /INVALID_TRANSITION/,
    );

    const events = await c.client.auditEvent.findMany({
      where: {
        entityType: {
          in: [
            "ACADEMY_REGISTRATION",
            "ACADEMY_REGISTRATION_SESSION",
            "ACADEMY_REGISTRATION_POLICY",
          ],
        },
      },
    });
    for (const action of [
      "ACADEMY_REGISTRATION_STATUS_CHANGED",
      "ACADEMY_REGISTRATION_SESSION_PUBLISHED",
      "ACADEMY_REGISTRATION_POLICY_APPROVED",
      "ACADEMY_REGISTRATION_DETAIL_VIEWED",
    ]) {
      assert.ok(
        events.some((e) => e.action === action),
        `${action} audited`,
      );
    }
    const serialized = JSON.stringify(
      events.map((e) => [e.summary, e.metadata, e.entityId]),
    );
    for (const pii of [PLAYER_TAG, GUARDIAN_TAG, "+6012", "dateOfBirth"]) {
      assert.ok(!serialized.includes(pii), `audit contains ${pii}`);
    }
  },
);

test(
  "capacity: concurrent confirmations, capacity reduction, closure and cancellation races",
  { skip },
  async () => {
    const c = await ctx();
    const confirmedCount = (sessionId) =>
      c.client.academyRegistration.count({
        where: { sessionId, status: "CONFIRMED" },
      });

    // Concurrent confirmations never exceed capacity.
    const small = await publishedSession(c, { capacity: 2 });
    const regs = [];
    for (let i = 0; i < 6; i += 1)
      regs.push(await createRegistration(c, small.id));
    const outcomes = await Promise.all(
      regs.map((r) => setStatus(c, r.id, "CONFIRMED", 1)),
    );
    assert.equal(outcomes.filter((o) => o.status === 200).length, 2);
    assert.ok(
      outcomes
        .filter((o) => o.status !== 200)
        .every((o) => o.body.code === "CAPACITY_EXCEEDED"),
    );
    assert.equal(await confirmedCount(small.id), 2);
    // The database refuses to exceed capacity for any writer.
    const pending = regs.filter((_, i) => outcomes[i].status !== 200);
    const sqlRace = await Promise.allSettled(
      pending.map((r) =>
        c.client.$executeRawUnsafe(
          `UPDATE academy_registrations SET status = 'CONFIRMED' WHERE id = '${r.id}'`,
        ),
      ),
    );
    assert.ok(sqlRace.every((r) => r.status === "rejected"));
    assert.equal(await confirmedCount(small.id), 2);
    // Capacity cannot drop below confirmed seats, via API or SQL.
    const lower = await api(
      c,
      `/admin/academy/registration-sessions/${small.id}`,
      {
        method: "PATCH",
        token: "admin",
        body: { expectedVersion: small.version, capacity: 1 },
      },
    );
    assert.equal(lower.status, 409);
    assert.equal(lower.body.code, "CAPACITY_BELOW_CONFIRMED");
    await expectDbReject(
      () =>
        c.client.$executeRawUnsafe(
          `UPDATE programme_offerings SET capacity = 1 WHERE id = '${small.programmeOfferingId}'`,
        ),
      /CAPACITY_BELOW_CONFIRMED/,
    );
    assert.ok(
      !(await api(c, "/academy/sessions")).body.items.some(
        (i) => i.id === small.id,
      ),
      "full sessions are not offered",
    );
    assert.equal(
      (await submit(c, regBody(small.id))).body.code,
      "SESSION_FULL",
    );

    // Confirmation racing with capacity reduction.
    for (let round = 0; round < 3; round += 1) {
      const s = await publishedSession(c, { capacity: 3 });
      const rs = [];
      for (let i = 0; i < 3; i += 1) rs.push(await createRegistration(c, s.id));
      assert.equal((await setStatus(c, rs[0].id, "CONFIRMED", 1)).status, 200);
      assert.equal((await setStatus(c, rs[1].id, "CONFIRMED", 1)).status, 200);
      const [confirm, reduce] = await Promise.all([
        setStatus(c, rs[2].id, "CONFIRMED", 1),
        api(c, `/admin/academy/registration-sessions/${s.id}`, {
          method: "PATCH",
          token: "admin",
          body: { expectedVersion: s.version, capacity: 2 },
        }),
      ]);
      const capacity = (
        await c.client.programmeOffering.findUnique({
          where: { id: s.programmeOfferingId },
        })
      ).capacity;
      const confirmed = await confirmedCount(s.id);
      assert.ok(
        confirmed <= capacity,
        `round ${round}: ${confirmed} > ${capacity}`,
      );
      assert.ok(
        (confirm.status === 200 &&
          reduce.body.code === "CAPACITY_BELOW_CONFIRMED") ||
          (reduce.status === 200 && confirm.body.code === "CAPACITY_EXCEEDED"),
        `round ${round}: ${confirm.status}/${reduce.status}`,
      );
    }

    // Confirmation racing with cancellation of a confirmed registration.
    for (let round = 0; round < 3; round += 1) {
      const s = await publishedSession(c, { capacity: 1 });
      const holder = await createRegistration(c, s.id);
      const waiting = await createRegistration(c, s.id);
      assert.equal((await setStatus(c, holder.id, "CONFIRMED", 1)).status, 200);
      const [cancel, confirm] = await Promise.all([
        setStatus(c, holder.id, "CANCELLED", 2, {
          reasonCode: "GUARDIAN_REQUEST",
        }),
        setStatus(c, waiting.id, "CONFIRMED", 1),
      ]);
      assert.equal(cancel.status, 200);
      assert.ok(
        confirm.status === 200 || confirm.body.code === "CAPACITY_EXCEEDED",
      );
      assert.ok((await confirmedCount(s.id)) <= 1);
      if (confirm.status === 200) assert.equal(await confirmedCount(s.id), 1);
    }

    // Submission racing with closure: every receipt is durable; nothing lands after the close.
    const closing = await publishedSession(c, { capacity: 50 });
    const submits = Array.from({ length: 8 }, () =>
      submit(c, regBody(closing.id)),
    );
    const closure = api(
      c,
      `/admin/academy/registration-sessions/${closing.id}/close`,
      {
        method: "POST",
        token: "admin",
        body: { expectedVersion: closing.version },
      },
    );
    const settled = await Promise.all([closure, ...submits]);
    assert.equal(settled[0].status, 201, settled[0].text);
    const receipts = settled.slice(1).filter((r) => r.status === 201);
    assert.ok(
      settled
        .slice(1)
        .every(
          (r) => r.status === 201 || r.body.code === "SESSION_NOT_AVAILABLE",
        ),
    );
    assert.equal(
      await c.client.academyRegistration.count({
        where: { sessionId: closing.id },
      }),
      receipts.length,
    );
    for (const receipt of receipts) {
      assert.ok(
        await c.client.academyRegistration.findUnique({
          where: { id: receipt.body.id },
        }),
        "a successful receipt always refers to a committed row",
      );
    }
    assert.equal(
      (await submit(c, regBody(closing.id))).body.code,
      "SESSION_NOT_AVAILABLE",
    );
    if (receipts.length) {
      const late = await setStatus(c, receipts[0].body.id, "CONFIRMED", 1);
      assert.equal(late.body.code, "SESSION_NOT_AVAILABLE");
    }

    // Publication racing with a configuration update: exactly one wins.
    const racing = await setSession(c);
    const [publish, patch] = await Promise.all([
      api(c, `/admin/academy/registration-sessions/${racing.id}/publish`, {
        method: "POST",
        token: "admin",
        body: {
          expectedVersion: racing.version,
          approvals: { scheduleApproved: true, ageRuleApproved: true },
        },
      }),
      api(c, `/admin/academy/registration-sessions/${racing.id}`, {
        method: "PATCH",
        token: "admin",
        body: { expectedVersion: racing.version, coachDisplayName: null },
      }),
    ]);
    const final = await api(
      c,
      `/admin/academy/registration-sessions/${racing.id}`,
      {
        token: "admin",
      },
    );
    assert.ok(
      (publish.status === 201) !== (patch.status === 200),
      `${publish.status}/${patch.status}`,
    );
    if (final.body.publicationState === "PUBLISHED") {
      assert.ok(
        final.body.coachDisplayName,
        "a published session is never incomplete",
      );
      assert.equal(patch.body.code, "STALE_VERSION");
    } else {
      assert.equal(publish.body.code, "STALE_VERSION");
    }
  },
);

test(
  "legacy membership, plan-link, public-offering and scheduling paths cannot bypass registration cohorts",
  { skip },
  async () => {
    const c = await ctx();
    const cohort = await publishedSession(c);
    const athlete = await c.client.athleteProfile.create({
      data: {
        displayName: `Syn Athlete ${RUN}`,
        dateOfBirth: new Date("2015-01-01"),
      },
    });
    const plan = await c.client.membershipPlan.create({
      data: {
        organizationId: ORG_A,
        name: `Syn Plan ${RUN}`,
        billingFrequency: "UPFRONT",
        upfrontAmountMinor: 100,
      },
    });
    await expectDbReject(
      () =>
        c.client.membership.create({
          data: {
            organizationId: ORG_A,
            athleteId: athlete.id,
            programmeOfferingId: cohort.programmeOfferingId,
            membershipPlanId: plan.id,
          },
        }),
      /OFFERING_REGISTRATION_ONLY/,
    );
    await expectDbReject(
      () =>
        c.client.membershipPlanOfferingEligibility.create({
          data: { planId: plan.id, offeringId: cohort.programmeOfferingId },
        }),
      /OFFERING_REGISTRATION_ONLY/,
    );
    const link = await api(c, "/admin/academy/membership-plan-offerings", {
      method: "POST",
      token: "admin",
      body: { planId: plan.id, offeringId: cohort.programmeOfferingId },
    });
    assert.equal(link.status, 409);
    assert.equal(link.body.code, "OFFERING_REGISTRATION_ONLY");
    const offerings = await api(c, "/academy/offerings");
    assert.ok(
      !offerings.body.some((o) => o.id === cohort.programmeOfferingId),
      "the legacy public list excludes cohorts",
    );

    const legacy = await c.client.programmeOffering.create({
      data: {
        organizationId: ORG_A,
        programmeId: c.programmeA.id,
        venueId: c.venueA.id,
        name: `Legacy ${RUN}`,
        capacity: 5,
        status: "OPEN",
      },
    });
    await c.client.membership.create({
      data: {
        organizationId: ORG_A,
        athleteId: athlete.id,
        programmeOfferingId: legacy.id,
        membershipPlanId: plan.id,
      },
    });
    await expectDbReject(
      () =>
        c.client.academyRegistrationSession.create({
          data: { organizationId: ORG_A, programmeOfferingId: legacy.id },
        }),
      /OFFERING_HAS_LEGACY_USAGE/,
    );
    assert.equal(
      await c.client.membership.count({
        where: { programmeOfferingId: cohort.programmeOfferingId },
      }),
      0,
    );

    const before = await api(
      c,
      `/admin/academy/registration-sessions/${cohort.id}`,
      { token: "admin" },
    );
    const training = await api(c, "/admin/scheduling/sessions", {
      method: "POST",
      token: "admin",
      body: {
        programmeOfferingId: cohort.programmeOfferingId,
        title: "Syn training",
        startsAt: `${FIRST_DATE}T06:00:00.000Z`,
        endsAt: `${FIRST_DATE}T08:00:00.000Z`,
        venueName: "Synthetic Venue A",
      },
    });
    assert.equal(training.status, 201, training.text);
    const cancel = await api(
      c,
      `/admin/scheduling/sessions/${training.body.id}/cancel`,
      { method: "POST", token: "admin", body: { reason: "synthetic" } },
    );
    assert.equal(cancel.status, 201, cancel.text);
    const after = await api(
      c,
      `/admin/academy/registration-sessions/${cohort.id}`,
      { token: "admin" },
    );
    for (const field of [
      "publicationState",
      "version",
      "capacity",
      "startTime",
      "weekday",
      "updatedAt",
    ]) {
      assert.deepEqual(after.body[field], before.body[field], field);
    }
    assert.ok(
      (await api(c, "/academy/sessions")).body.items.some(
        (i) => i.id === cohort.id,
      ),
    );

    // Existing Register Interest stays independent of registration consent.
    const lead = await api(c, "/academy/leads", {
      method: "POST",
      body: {
        guardianName: `Syn Lead ${RUN}`,
        phone: nextPhone(),
        childAge: 11,
        consent: true,
        source: "3x3-oct24",
        idempotencyKey: `lead-${RUN}-${randomUUID()}`,
      },
    });
    assert.equal(lead.status, 201, lead.text);
    assert.equal(lead.body.status, "RECEIVED");
  },
);

test(
  "privacy: no personal data in logs, errors or public bodies; the Sentry scrubber strips registration events",
  { skip },
  async () => {
    const c = await ctx();
    const session = await publishedSession(c);
    const body = regBody(session.id);
    const responses = [
      await submit(c, {
        ...body,
        guardian: { ...body.guardian, phone: "bad" },
      }),
      await submit(c, { ...body, sessionId: randomUUID() }),
      await submit(c, body, { key: "x" }),
      await api(c, "/academy/sessions"),
      await api(c, "/academy/registration-config"),
    ];
    for (const res of responses) {
      for (const pii of [
        PLAYER_TAG,
        GUARDIAN_TAG,
        body.guardian.phone,
        body.emergencyContact.phone,
      ]) {
        assert.ok(!res.text.includes(pii), `${res.status} body contains PII`);
      }
    }
    const receipt = await submit(c, body);
    assert.equal(receipt.status, 201);
    assert.ok(
      !receipt.text.includes(PLAYER_TAG) &&
        !receipt.text.includes(body.guardian.phone),
    );
    const logs = output.text();
    for (const pii of [
      PLAYER_TAG,
      GUARDIAN_TAG,
      "+6012",
      "SIMULATED",
      "RL_DOWN",
    ]) {
      assert.ok(!logs.includes(pii), `logs contain ${pii}`);
    }
    const event = {
      request: {
        url: "https://api.example.test/v1/admin/academy/registrations/search?q=Syn",
        data: { q: "Syn" },
        query_string: "q=Syn",
        cookies: { a: "b" },
        headers: { authorization: "x" },
      },
      exception: {
        values: [
          {
            value: `Unique constraint failed on guardian_phone ${body.guardian.phone}`,
          },
        ],
      },
      extra: { body },
      breadcrumbs: [{ message: "x" }],
      user: { email: "a@b.test" },
    };
    const scrubbed = scrubRegistrationEvent(structuredClone(event));
    assert.equal(scrubbed.request.data, undefined);
    assert.equal(scrubbed.request.query_string, undefined);
    assert.equal(
      scrubbed.request.url,
      "https://api.example.test/v1/admin/academy/registrations/search",
    );
    assert.ok(!JSON.stringify(scrubbed).includes(body.guardian.phone));
    assert.equal(scrubbed.extra, undefined);
    const other = {
      request: { url: "https://api.example.test/v1/me", data: { keep: true } },
    };
    assert.deepEqual(scrubRegistrationEvent(structuredClone(other)), other);
  },
);
