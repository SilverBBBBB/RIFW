import test from "node:test";
import assert from "node:assert/strict";
import { getBearerToken, normalizeRole, passwordValidationError } from "../src/shared/auth";
import { compareRoutines } from "../src/functions/CompareRoutine";

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
