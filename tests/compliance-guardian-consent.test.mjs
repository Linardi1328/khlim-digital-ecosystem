import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("managed minor creation requires versioned guardian data consent", async () => {
  const dto = await read("apps/api/src/family/family.dto.ts");
  const service = await read("apps/api/src/family/family.service.ts");
  const enrol = await read("apps/web/app/enrol/page.tsx");

  assert.match(dto, /guardianDataConsent\?: boolean/);
  assert.match(dto, /privacyNoticeVersion\?: string/);

  assert.match(service, /body\?\.guardianDataConsent !== true/);
  assert.match(service, /"privacyNoticeVersion"/);
  assert.match(service, /transaction\.auditEvent\.create/);
  assert.match(service, /actorUserId: guardianUserId/);
  assert.match(service, /action: "guardian_data_consent\.accepted"/);
  assert.match(service, /entityId: athlete\.id/);
  assert.match(service, /consentType: "MINOR_PERSONAL_DATA"/);
  assert.match(service, /authorityConfirmed: true/);
  assert.doesNotMatch(service, /body\?\.(acceptedAt|consentTimestamp)/);

  assert.match(enrol, /PRIVACY_NOTICE_VERSION/);
  assert.match(enrol, /guardianDataConsent: true/);
  assert.match(enrol, /privacyNoticeVersion: PRIVACY_NOTICE_VERSION/);
});
