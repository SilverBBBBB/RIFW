import test from "node:test";
import assert from "node:assert/strict";
import { getBearerToken, normalizeRole, passwordValidationError } from "../src/shared/auth";
import { compareRoutines } from "../src/functions/CompareRoutine";
import { canReviewRoutine, hasMeaningfulRoutineChanges, rowVersionMatches } from "../src/shared/routineReview";

test("password policy rejects weak passwords", () => {
  assert.ok(passwordValidationError("short"));
  assert.equal(passwordValidationError("Valid-Password-123!"), null);
});

test("routine comparison reads the nested routine object", () => {
  const changes = compareRoutines(
    { routine: { routine_name: "Before", fund_types: [] } },
    { routine: { routine_name: "After", fund_types: [] } }
  );
  assert.deepEqual(changes.routine_name, { old: "Before", new: "After" });
});

test("no-op routine saves do not create a review requirement", () => {
  const routine = { routine: { routine_name: "Unchanged", fund_types: [], helper_routines: [], region: [] } };
  const changes = compareRoutines(routine, routine);
  assert.deepEqual(changes, {});
  assert.equal(hasMeaningfulRoutineChanges(changes), false);
});

test("peer review requires a different known user", () => {
  assert.equal(canReviewRoutine(11, 12), true);
  assert.equal(canReviewRoutine(11, 11), false);
  assert.equal(canReviewRoutine(null, 12), false);
});

test("routine review rejects stale row versions", () => {
  const currentVersion = Buffer.from([1, 2, 3, 4]);
  assert.equal(rowVersionMatches(currentVersion, currentVersion.toString("base64")), true);
  assert.equal(rowVersionMatches(currentVersion, Buffer.from([4, 3, 2, 1]).toString("base64")), false);
});

test("database roles are normalized case-insensitively", () => {
  assert.equal(normalizeRole("admin"), "Admin");
  assert.equal(normalizeRole(" User "), "User");
  assert.equal(normalizeRole("guest"), null);
});

test("bearer tokens support the proxy-safe header and standard fallback", () => {
  assert.equal(getBearerToken(new Headers({ "X-Authorization": "Bearer proxy-token" })), "proxy-token");
  assert.equal(getBearerToken(new Headers({ Authorization: "Bearer standard-token" })), "standard-token");
  assert.equal(getBearerToken(new Headers({ "X-Authorization": "Basic invalid" })), null);
});
