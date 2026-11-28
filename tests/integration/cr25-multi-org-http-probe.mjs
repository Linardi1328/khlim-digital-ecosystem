import assert from "node:assert/strict";
import {
  AppModule,
  NestFactory,
  SupabaseJwtService,
  UnauthorizedException,
} from "./academy-registration-v1.helpers.mjs";

const {
  ORG_B,
  ORG_B_SLUG,
  FOREIGN_SUBJECT,
  FOREIGN_EMAIL,
  ADMIN_SUBJECT,
  ADMIN_EMAIL,
} = process.env;

assert.equal(
  process.env.KHLIM_MULTI_ORGANIZATION_ENABLED,
  "true",
  "Probe must execute with KHLIM_MULTI_ORGANIZATION_ENABLED=true",
);
assert.ok(ORG_B && ORG_B_SLUG, "Missing ORG_B test parameters");

const app = await NestFactory.create(AppModule, { logger: false });
try {
  app.setGlobalPrefix("v1");
  app.getHttpAdapter().getInstance().set("trust proxy", true);

  const identities = new Map([
    [
      "foreign",
      {
        subject: FOREIGN_SUBJECT,
        email: FOREIGN_EMAIL,
        payload: {
          sub: FOREIGN_SUBJECT,
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
    [
      "admin",
      {
        subject: ADMIN_SUBJECT,
        email: ADMIN_EMAIL,
        payload: {
          sub: ADMIN_SUBJECT,
          aal: "aal2",
          aud: "authenticated",
        },
      },
    ],
  ]);

  app.get(SupabaseJwtService).verify = async (token) => {
    const identity = identities.get(token);
    if (!identity) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return identity;
  };

  await app.listen(0, "127.0.0.1");
  const url = await app.getUrl();

  const foreignOrgB = await fetch(`${url}/v1/admin/session`, {
    headers: {
      authorization: "Bearer foreign",
      "x-khlim-organization": ORG_B_SLUG,
    },
  });
  const foreignOrgBBody = await foreignOrgB.json();
  assert.equal(
    foreignOrgB.status,
    200,
    `Expected 200 for Org B staff on Org B slug, got ${foreignOrgB.status}: ${JSON.stringify(foreignOrgBBody)}`,
  );
  assert.equal(foreignOrgBBody.organizationId, ORG_B);
  assert.deepEqual(foreignOrgBBody.roles, ["ACADEMY_ADMIN"]);

  const adminOnOrgB = await fetch(`${url}/v1/admin/session`, {
    headers: {
      authorization: "Bearer admin",
      "x-khlim-organization": ORG_B_SLUG,
    },
  });
  assert.equal(
    adminOnOrgB.status,
    403,
    `Expected 403 for Org A staff targeting Org B slug, got ${adminOnOrgB.status}`,
  );

  const foreignOnDefaultOrg = await fetch(`${url}/v1/admin/session`, {
    headers: {
      authorization: "Bearer foreign",
    },
  });
  assert.equal(
    foreignOnDefaultOrg.status,
    403,
    `Expected 403 for Org B staff on default Org A, got ${foreignOnDefaultOrg.status}`,
  );
} finally {
  await app.close();
}
