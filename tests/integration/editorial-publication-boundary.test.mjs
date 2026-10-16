import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
const {
  EditorialService,
} = require("../../apps/api/dist/editorial/editorial.service.js");

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const MEDIA_URL = "https://example.test/synthetic-photo.jpg?token=synthetic";

function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !url.pathname.toLowerCase().includes("test")
  ) {
    throw new Error("An isolated local test database is required");
  }
  return true;
}

const enabled = databaseTestsEnabled();

test(
  "PostgreSQL locks the editorial draft through validation and withholds legacy text URLs",
  { skip: enabled ? false : "Set KHLIM_TEST_DATABASE=1 for local DB tests" },
  async () => {
    const first = new PrismaService();
    const second = new PrismaService();
    const editorial = new EditorialService(first);
    const ids = [];
    let releaseRead = () => {};
    try {
      const base = {
        type: "PLAYER_SPOTLIGHT",
        slug: `synthetic-${randomUUID()}`,
        title: "Synthetic verified title",
        eventName: "Synthetic event",
        summary: "Synthetic summary",
        playerName: "Synthetic Player",
        achievement: "Synthetic selection",
        achievedOnLabel: "2026",
        articleParagraphs: [
          "First synthetic paragraph.",
          "Second synthetic paragraph.",
        ],
        photoLabel: "Synthetic placeholder",
        factsVerified: true,
        imageUrl: null,
      };

      const legacy = await first.client.editorialEntry.create({
        data: {
          ...base,
          organizationId: ORGANIZATION_ID,
          slug: `synthetic-legacy-${randomUUID()}`,
          summary: `See ${MEDIA_URL}`,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
      ids.push(legacy.id);
      const publicLegacy = await editorial.findPublishedSpotlight(legacy.slug);
      assert.equal(publicLegacy.summary, "See [link withheld]");
      assert.equal(Object.hasOwn(publicLegacy, "imageUrl"), false);

      const linkedDraft = await editorial.create(ORGANIZATION_ID, {
        ...base,
        slug: `synthetic-link-${randomUUID()}`,
        summary: `See ${MEDIA_URL}`,
      });
      ids.push(linkedDraft.id);
      await assert.rejects(
        editorial.publish(ORGANIZATION_ID, linkedDraft.id),
        (error) => error.getStatus() === 400 && /text/.test(error.message),
      );

      const draft = await editorial.create(ORGANIZATION_ID, base);
      ids.push(draft.id);
      let signalRead = () => {};
      const readReached = new Promise((resolve) => {
        signalRead = resolve;
      });
      const continueRead = new Promise((resolve) => {
        releaseRead = resolve;
      });
      const lockingPrisma = {
        client: {
          $transaction: (callback) =>
            first.client.$transaction((tx) =>
              callback({
                $queryRaw: (...args) => tx.$queryRaw(...args),
                editorialEntry: {
                  findFirst: async (args) => {
                    const row = await tx.editorialEntry.findFirst(args);
                    signalRead();
                    await continueRead;
                    return row;
                  },
                  updateMany: (args) => tx.editorialEntry.updateMany(args),
                  findFirstOrThrow: (args) =>
                    tx.editorialEntry.findFirstOrThrow(args),
                },
              }),
            ),
        },
      };
      const publishPromise = new EditorialService(lockingPrisma).publish(
        ORGANIZATION_ID,
        draft.id,
      );
      await readReached;

      let signalEdit = () => {};
      const editStarted = new Promise((resolve) => {
        signalEdit = resolve;
      });
      const editingPrisma = {
        client: {
          editorialEntry: {
            findFirst: (args) => second.client.editorialEntry.findFirst(args),
            update: (args) => {
              signalEdit();
              return second.client.editorialEntry.update(args);
            },
          },
        },
      };
      const editPromise = new EditorialService(editingPrisma).update(
        ORGANIZATION_ID,
        draft.id,
        {
          articleParagraphs: [{ imageUrl: MEDIA_URL }, { imageUrl: MEDIA_URL }],
        },
      );
      await editStarted;
      const beforeRelease = await Promise.race([
        editPromise.then(
          () => "completed",
          () => "rejected",
        ),
        new Promise((resolve) => setTimeout(() => resolve("pending"), 100)),
      ]);
      assert.equal(
        beforeRelease,
        "pending",
        "the draft edit must wait on the row lock",
      );

      releaseRead();
      const published = await publishPromise;
      assert.equal(published.status, "PUBLISHED");
      await assert.rejects(editPromise);
      const persisted = await first.client.editorialEntry.findUnique({
        where: { id: draft.id },
      });
      assert.deepEqual(persisted.articleParagraphs, base.articleParagraphs);
      assert.equal(persisted.status, "PUBLISHED");
    } finally {
      releaseRead();
      await first.client.editorialEntry.deleteMany({
        where: { id: { in: ids } },
      });
      await first.onModuleDestroy();
      await second.onModuleDestroy();
    }
  },
);
