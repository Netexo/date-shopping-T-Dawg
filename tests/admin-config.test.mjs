import test from "node:test";
import assert from "node:assert/strict";
import { readAdminPassword } from "../app/lib/admin-config.js";
import { createAdminSession, verifyAdminSession, passwordMatches } from "../app/lib/admin-session.js";

test("missing and invalid password configuration produce distinct deployment-aware errors", () => {
  for (const ADMIN_PASSWORD of [undefined, "", null]) {
    assert.throws(() => readAdminPassword({ADMIN_PASSWORD}),error => error.status === 503 && error.message.includes("fehlt") && error.message.includes("Production oder Preview"));
  }
  for (const ADMIN_PASSWORD of ["fixture-short", "x".repeat(1025)]) {
    assert.throws(() => readAdminPassword({ADMIN_PASSWORD}),error => error.status === 503 && error.message.includes("16 und 1024") && !error.message.includes(ADMIN_PASSWORD));
    assert.equal(passwordMatches(ADMIN_PASSWORD,ADMIN_PASSWORD),false);
    assert.throws(() => createAdminSession(ADMIN_PASSWORD));
  }
});
test("configuration is read on invocation and exact password value is preserved", () => {
  const environment = {};
  assert.throws(() => readAdminPassword(environment));
  environment.ADMIN_PASSWORD = "fixture-strong-password ";
  const first = readAdminPassword(environment);
  const session = createAdminSession(first);
  assert.equal(verifyAdminSession(session,readAdminPassword(environment)),true);
  assert.equal(passwordMatches(first,readAdminPassword(environment)),true);
  assert.equal(passwordMatches(first.trim(),readAdminPassword(environment)),false);
  environment.ADMIN_PASSWORD = "fixture-replacement-password";
  assert.equal(verifyAdminSession(session,readAdminPassword(environment)),false);
});
test("both configured length boundaries are accepted", () => {
  for (const length of [16,1024]) assert.equal(readAdminPassword({ADMIN_PASSWORD:"x".repeat(length)}).length,length);
});
