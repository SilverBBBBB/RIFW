import test from "node:test";
import assert from "node:assert/strict";
import { passwordValidationError } from "../src/shared/auth";
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
