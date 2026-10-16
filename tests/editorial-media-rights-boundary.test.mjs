import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
createRequire(
  new URL("../apps/api/dist/editorial/editorial.service.js", import.meta.url),
)("reflect-metadata");
const {
  EditorialService,
} = require("../apps/api/dist/editorial/editorial.service.js");
const {
  EditorialController,
} = require("../apps/api/dist/editorial/editorial.controller.js");
const {
  MFA_REQUIRED_KEY,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} = require("../apps/api/dist/auth/auth.constants.js");

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000004";
const MEDIA_URL = "https://example.test/unverified-youth-photo.jpg";

function entry(overrides = {}) {
  return {
    id: "entry-1",
    organizationId: ORGANIZATION_ID,
    type: "PLAYER_SPOTLIGHT",
    slug: "player-story",
    title: "Verified milestone",
    eventName: "Example event",
    summary: "A verified text summary.",
    yearLabel: null,
    playerName: "Example Player",
    achievement: "Selection",
    achievedOnLabel: "2026",
    articleParagraphs: [
      "First verified paragraph.",
      { imageUrl: MEDIA_URL, caption: "untrusted nested media" },
      "Second verified paragraph.",
    ],
    photoLabel: "Photo placeholder",
    imageUrl: MEDIA_URL,
    factsVerified: true,
    aiAssisted: false,
    status: "PUBLISHED",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function fakePrisma(rows, beforeUpdateMany = () => {}) {
  const calls = [];
  const matches = (row, where) =>
    Object.entries(where).every(([key, value]) =>
      value && typeof value === "object" && "not" in value
        ? row[key] !== value.not
        : row[key] === value,
    );
  const project = (row, select) =>
    Object.fromEntries(
      Object.keys(select)
        .filter((key) => select[key])
        .map((key) => [key, row[key]]),
    );
  const editorialEntry = {
    async findMany(args) {
      calls.push(["findMany", args]);
      return rows
        .filter((row) => matches(row, args.where))
        .map((row) => (args.select ? project(row, args.select) : row));
    },
    async findFirst(args) {
      calls.push(["findFirst", args]);
      const row = rows.find((candidate) => matches(candidate, args.where));
      return row ? (args.select ? project(row, args.select) : row) : null;
    },
    async updateMany(args) {
      calls.push(["updateMany", args]);
      beforeUpdateMany();
      const matching = rows.filter((row) => matches(row, args.where));
      matching.forEach((row) => Object.assign(row, args.data));
      return { count: matching.length };
    },
    async update(args) {
      calls.push(["update", args]);
      const row = rows.find((candidate) => matches(candidate, args.where));
      if (!row) throw new Error("No matching editorial entry");
      Object.assign(
        row,
        Object.fromEntries(
          Object.entries(args.data).filter(([, value]) => value !== undefined),
        ),
      );
      return row;
    },
  };
  return { client: { editorialEntry }, calls };
}

test("all public editorial routes omit stored and nested media URLs while preserving text", async () => {
  const rows = [
    entry({ id: "spotlight" }),
    entry({ id: "achievement", type: "ACHIEVEMENT", slug: null }),
    entry({ id: "foreign", organizationId: OTHER_ORGANIZATION_ID }),
    entry({ id: "draft", status: "DRAFT" }),
  ];
  const prisma = fakePrisma(rows);
  const controller = new EditorialController(new EditorialService(prisma));
  const achievements = await controller.listAchievements();
  const spotlights = await controller.listSpotlights();
  const detail = await controller.getSpotlight("player-story");

  assert.deepEqual(
    achievements.map(({ id }) => id),
    ["achievement"],
  );
  assert.deepEqual(
    spotlights.map(({ id }) => id),
    ["spotlight"],
  );
  assert.equal(detail.id, "spotlight");
  for (const result of [...achievements, ...spotlights, detail]) {
    const json = JSON.stringify(result);
    assert.equal(Object.hasOwn(result, "imageUrl"), false);
    assert.equal(json.includes(MEDIA_URL), false);
    assert.deepEqual(result.articleParagraphs, [
      "First verified paragraph.",
      "Second verified paragraph.",
    ]);
    assert.equal(result.summary, "A verified text summary.");
  }
  for (const [operation, args] of prisma.calls) {
    assert.equal(args.where.organizationId, ORGANIZATION_ID);
    assert.equal(args.where.status, "PUBLISHED");
    assert.equal(args.where.factsVerified, true);
    assert.equal(args.select.imageUrl, undefined, operation);
  }
});

test("publication rejects a fact-verified draft with an unverified image URL", async () => {
  const prisma = fakePrisma([entry({ status: "DRAFT" })]);
  const service = new EditorialService(prisma);
  await assert.rejects(
    service.publish(ORGANIZATION_ID, "entry-1"),
    (error) => error.getStatus() === 400 && /Image URLs/.test(error.message),
  );
  assert.equal(
    prisma.calls.some(([operation]) => operation === "updateMany"),
    false,
  );
});

test("text-only drafts can publish, with a final database-side media and organization condition", async () => {
  const row = entry({ status: "DRAFT", imageUrl: null });
  const prisma = fakePrisma([row]);
  const service = new EditorialService(prisma);
  const published = await service.publish(ORGANIZATION_ID, row.id);
  assert.equal(published.status, "PUBLISHED");
  const update = prisma.calls.find(
    ([operation]) => operation === "updateMany",
  )[1];
  assert.deepEqual(update.where, {
    id: row.id,
    organizationId: ORGANIZATION_ID,
    status: "DRAFT",
    factsVerified: true,
    imageUrl: null,
  });
  await assert.rejects(
    service.publish(OTHER_ORGANIZATION_ID, row.id),
    (error) => error.getStatus() === 404,
  );
});

test("an image added while publication is in flight prevents the database transition", async () => {
  const row = entry({ status: "DRAFT", imageUrl: null });
  const prisma = fakePrisma([row], () => {
    row.imageUrl = MEDIA_URL;
  });
  await assert.rejects(
    new EditorialService(prisma).publish(ORGANIZATION_ID, row.id),
    (error) => error.getStatus() === 400 && /changed/.test(error.message),
  );
  assert.equal(row.status, "DRAFT");
});

test("an authorized draft edit can clear media without weakening organization or publish boundaries", async () => {
  const row = entry({ status: "DRAFT" });
  const prisma = fakePrisma([row]);
  const service = new EditorialService(prisma);
  await assert.rejects(
    service.update(OTHER_ORGANIZATION_ID, row.id, { imageUrl: "" }),
    (error) => error.getStatus() === 404,
  );
  const updated = await service.update(ORGANIZATION_ID, row.id, {
    imageUrl: "",
  });
  assert.equal(updated.imageUrl, null);
  assert.equal(
    (await service.publish(ORGANIZATION_ID, row.id)).status,
    "PUBLISHED",
  );
  await assert.rejects(
    service.update(ORGANIZATION_ID, row.id, { imageUrl: MEDIA_URL }),
    (error) => error.getStatus() === 400,
  );
});

test("management publication retains role and MFA gates", () => {
  const publish = EditorialController.prototype.publish;
  assert.deepEqual(Reflect.getMetadata(REQUIRED_ROLES_KEY, publish), [
    "SUPER_ADMIN",
    "MANAGEMENT",
  ]);
  assert.equal(Reflect.getMetadata(MFA_REQUIRED_KEY, publish), true);
  assert.equal(Reflect.getMetadata(PUBLIC_ROUTE_KEY, publish), undefined);
  for (const route of [
    EditorialController.prototype.listAchievements,
    EditorialController.prototype.listSpotlights,
    EditorialController.prototype.getSpotlight,
  ]) {
    assert.equal(Reflect.getMetadata(PUBLIC_ROUTE_KEY, route), true);
  }
});
