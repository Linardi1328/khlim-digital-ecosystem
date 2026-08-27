import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);

const { UnauthorizedException } = apiRequire("@nestjs/common");
const { NestFactory } = apiRequire("@nestjs/core");
const { AppModule } = require("../../apps/api/dist/app.module.js");
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  SupabaseJwtService,
} = require("../../apps/api/dist/auth/supabase-jwt.service.js");

const IDS = Object.freeze({
  management: "10101010-1010-4010-8010-101010101010",
  academyAdmin: "20202020-2020-4020-8020-202020202020",
  financeAdmin: "30303030-3030-4030-8030-303030303030",
  guardian: "40404040-4040-4040-8040-404040404040",
  target: "50505050-5050-4050-8050-505050505050",
  superAdminTarget: "60606060-6060-4060-8060-606060606060",
});

const SUBJECTS = Object.freeze({
  management: "pre-alpha-admin-management",
  academyAdmin: "pre-alpha-admin-academy",
  financeAdmin: "pre-alpha-admin-finance",
  guardian: "pre-alpha-admin-guardian",
  target: "pre-alpha-admin-target",
  superAdminTarget: "pre-alpha-admin-super-target",
});

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for Admin HTTP integration tests",
    );
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      "Admin HTTP integration tests require a database whose name contains 'test'",
    );
  }

  return true;
}

function makeIdentity(subject, email, aal) {
  return {
    subject,
    email,
    payload: {
      sub: subject,
      email,
      aal,
      aud: "authenticated",
    },
  };
}

function installJwtDouble(jwt) {
  const tokens = new Map([
    [
      "management-aal2",
      makeIdentity(
        SUBJECTS.management,
        "management.admin-http@example.test",
        "aal2",
      ),
    ],
    [
      "management-aal1",
      makeIdentity(
        SUBJECTS.management,
        "management.admin-http@example.test",
        "aal1",
      ),
    ],
    [
      "academy-aal2",
      makeIdentity(
        SUBJECTS.academyAdmin,
        "academy.admin-http@example.test",
        "aal2",
      ),
    ],
    [
      "academy-aal1",
      makeIdentity(
        SUBJECTS.academyAdmin,
        "academy.admin-http@example.test",
        "aal1",
      ),
    ],
    [
      "finance-aal2",
      makeIdentity(
        SUBJECTS.financeAdmin,
        "finance.admin-http@example.test",
        "aal2",
      ),
    ],
    [
      "guardian-aal2",
      makeIdentity(
        SUBJECTS.guardian,
        "guardian.admin-http@example.test",
        "aal2",
      ),
    ],
    [
      "target-aal2",
      makeIdentity(SUBJECTS.target, "target.admin-http@example.test", "aal2"),
    ],
  ]);

  jwt.verify = async (token) => {
    const identity = tokens.get(token);
    if (!identity) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return identity;
  };
}

async function cleanup(client) {
  await client.venue.deleteMany({
    where: { name: { startsWith: "Pre-Alpha Admin HTTP" } },
  });
  await client.user.deleteMany({
    where: { id: { in: Object.values(IDS) } },
  });
}

async function seed(client) {
  await client.user.createMany({
    data: [
      {
        id: IDS.management,
        authProviderSubject: SUBJECTS.management,
        email: "management.admin-http@example.test",
      },
      {
        id: IDS.academyAdmin,
        authProviderSubject: SUBJECTS.academyAdmin,
        email: "academy.admin-http@example.test",
      },
      {
        id: IDS.financeAdmin,
        authProviderSubject: SUBJECTS.financeAdmin,
        email: "finance.admin-http@example.test",
      },
      {
        id: IDS.guardian,
        authProviderSubject: SUBJECTS.guardian,
        email: "guardian.admin-http@example.test",
      },
      {
        id: IDS.target,
        authProviderSubject: SUBJECTS.target,
        email: "target.admin-http@example.test",
      },
      {
        id: IDS.superAdminTarget,
        authProviderSubject: SUBJECTS.superAdminTarget,
        email: "super-target.admin-http@example.test",
      },
    ],
  });

  await client.userRoleAssignment.createMany({
    data: [
      { userId: IDS.management, role: "MANAGEMENT" },
      { userId: IDS.academyAdmin, role: "ACADEMY_ADMIN" },
      { userId: IDS.financeAdmin, role: "FINANCE_ADMIN" },
      { userId: IDS.guardian, role: "GUARDIAN" },
      { userId: IDS.target, role: "GUARDIAN" },
      { userId: IDS.target, role: "COACH" },
      { userId: IDS.superAdminTarget, role: "SUPER_ADMIN" },
    ],
  });
}

async function jsonRequest(baseUrl, path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options.body !== undefined)
    headers.set("content-type", "application/json");

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body };
}

function assertError(result, status, messagePattern) {
  assert.equal(result.response.status, status);
  assert.match(String(result.body?.message ?? result.body), messagePattern);
}

const enabled = databaseTestsEnabled();

test(
  "pre-alpha Admin HTTP integration enforces persisted roles, MFA, and account state",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 to run database tests" },
  async (t) => {
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("v1");

    const prisma = app.get(PrismaService);
    const client = prisma.client;
    installJwtDouble(app.get(SupabaseJwtService));

    await cleanup(client);
    await seed(client);
    await app.listen(0, "127.0.0.1");

    const address = app.getHttpServer().address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      await t.test(
        "identity administration requires bearer authentication",
        async () => {
          const missing = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}`,
          );
          assertError(missing, 401, /Bearer access token is required/);

          const invalid = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}`,
            { token: "unknown-token" },
          );
          assertError(invalid, 401, /Invalid or expired access token/);
        },
      );

      await t.test(
        "identity administration enforces both MFA and scoped roles",
        async () => {
          const lowAssurance = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}`,
            { token: "management-aal1" },
          );
          assertError(lowAssurance, 403, /MFA assurance level 2 is required/);

          const guardian = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}`,
            { token: "guardian-aal2" },
          );
          assertError(guardian, 403, /Insufficient permissions/);

          const finance = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}`,
            { token: "finance-aal2" },
          );
          assertError(finance, 403, /Insufficient permissions/);

          const management = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}`,
            { token: "management-aal2" },
          );
          assert.equal(management.response.status, 200);
          assert.equal(management.body.id, IDS.target);
        },
      );

      await t.test(
        "staff role replacement preserves family roles",
        async () => {
          const updated = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}/staff-roles`,
            {
              method: "PUT",
              token: "management-aal2",
              body: { roles: ["ACADEMY_ADMIN"] },
            },
          );

          assert.equal(updated.response.status, 200);
          assert.deepEqual(
            updated.body.map((assignment) => assignment.role).sort(),
            ["ACADEMY_ADMIN", "GUARDIAN"],
          );

          const persistedRoles = await client.userRoleAssignment.findMany({
            where: { userId: IDS.target },
            select: { role: true },
            orderBy: { role: "asc" },
          });
          assert.deepEqual(
            persistedRoles.map((assignment) => assignment.role).sort(),
            ["ACADEMY_ADMIN", "GUARDIAN"],
          );
        },
      );

      await t.test(
        "management cannot assign or modify Super Admin authority",
        async () => {
          const assign = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}/staff-roles`,
            {
              method: "PUT",
              token: "management-aal2",
              body: { roles: ["SUPER_ADMIN"] },
            },
          );
          assertError(assign, 403, /Only a Super Admin can assign Super Admin/);

          const modify = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.superAdminTarget}/status`,
            {
              method: "PATCH",
              token: "management-aal2",
              body: { status: "SUSPENDED" },
            },
          );
          assertError(
            modify,
            403,
            /Only a Super Admin can modify a Super Admin/,
          );
        },
      );

      await t.test(
        "staff cannot change their own roles or account state",
        async () => {
          const roles = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.management}/staff-roles`,
            {
              method: "PUT",
              token: "management-aal2",
              body: { roles: ["MANAGEMENT"] },
            },
          );
          assertError(roles, 403, /Staff cannot change their own roles/);

          const status = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.management}/status`,
            {
              method: "PATCH",
              token: "management-aal2",
              body: { status: "SUSPENDED" },
            },
          );
          assertError(
            status,
            403,
            /Staff cannot change their own account status/,
          );
        },
      );

      await t.test(
        "academy writes require the academy role plus MFA",
        async () => {
          const lowAssurance = await jsonRequest(
            baseUrl,
            "/v1/admin/academy/venues",
            {
              method: "POST",
              token: "academy-aal1",
              body: { name: "Pre-Alpha Admin HTTP Low AAL Venue" },
            },
          );
          assertError(lowAssurance, 403, /MFA assurance level 2 is required/);

          const finance = await jsonRequest(
            baseUrl,
            "/v1/admin/academy/venues",
            {
              method: "POST",
              token: "finance-aal2",
              body: { name: "Pre-Alpha Admin HTTP Finance Venue" },
            },
          );
          assertError(finance, 403, /Insufficient permissions/);

          const academy = await jsonRequest(
            baseUrl,
            "/v1/admin/academy/venues",
            {
              method: "POST",
              token: "academy-aal2",
              body: {
                name: "Pre-Alpha Admin HTTP Academy Venue",
                address: "Synthetic integration test venue",
              },
            },
          );
          assert.equal(academy.response.status, 201);
          assert.equal(academy.body.name, "Pre-Alpha Admin HTTP Academy Venue");
        },
      );

      await t.test(
        "newly persisted staff roles take effect on the next request",
        async () => {
          const result = await jsonRequest(
            baseUrl,
            "/v1/admin/academy/venues",
            {
              method: "POST",
              token: "target-aal2",
              body: { name: "Pre-Alpha Admin HTTP Promoted Venue" },
            },
          );

          assert.equal(result.response.status, 201);
        },
      );

      await t.test(
        "suspended staff tokens stop authorizing immediately",
        async () => {
          const suspended = await jsonRequest(
            baseUrl,
            `/v1/admin/users/${IDS.target}/status`,
            {
              method: "PATCH",
              token: "management-aal2",
              body: { status: "SUSPENDED" },
            },
          );
          assert.equal(suspended.response.status, 200);
          assert.equal(suspended.body.status, "SUSPENDED");

          const staleSession = await jsonRequest(
            baseUrl,
            "/v1/admin/academy/venues",
            {
              method: "POST",
              token: "target-aal2",
              body: { name: "Pre-Alpha Admin HTTP Suspended Venue" },
            },
          );
          assertError(staleSession, 403, /KHLIM account is not active/);

          assert.equal(
            await client.venue.count({
              where: { name: "Pre-Alpha Admin HTTP Suspended Venue" },
            }),
            0,
          );
        },
      );
    } finally {
      await cleanup(client);
      await app.close();
    }
  },
);
