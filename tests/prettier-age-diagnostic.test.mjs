import { readFileSync } from "node:fs";
import { test } from "node:test";
import prettier from "prettier";

test("temporary programme eligibility formatting diagnostic", async () => {
  const path = "apps/api/src/academy/academy.service.ts";
  const source = readFileSync(path, "utf8");
  const formatted = await prettier.format(source, { filepath: path });
  const start = formatted.indexOf("function ageOnDate");
  const end = formatted.indexOf("@Injectable()", start);
  const eligibilityStart = formatted.indexOf("const eligibility =", end);
  const eligibilityEnd = formatted.indexOf("const duplicate =", eligibilityStart);
  console.log("PRETTIER_AGE_START");
  console.log(formatted.slice(start, end));
  console.log(formatted.slice(eligibilityStart, eligibilityEnd));
  console.log("PRETTIER_AGE_END");
});
