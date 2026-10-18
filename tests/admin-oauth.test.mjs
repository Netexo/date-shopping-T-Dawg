import test from "node:test";
import assert from "node:assert/strict";
import { oauthConfig,startOAuth,verifyFlow,authenticateCode,verifyOAuthSession } from "../app/lib/admin-oauth.js";

const environment = {
  ADMIN_GITHUB_CLIENT_ID:"fixture-client",ADMIN_GITHUB_CLIENT_SECRET:"fixture-secret",
  ADMIN_GITHUB_USER_ID:"12345",ADMIN_SESSION_SECRET:"fixture-session-secret-at-least-32-characters",
  ADMIN_AUTH_ORIGIN:"https://example.test",
};
const config = oauthConfig(environment);
test("OAuth fails closed without all configuration and rejects untrusted redirect origins", () => {
  for (const key of Object.keys(environment)) assert.throws(() => oauthConfig({...environment,[key]:""}));
  for (const origin of ["https://example.test/","http://example.test","https://example.test/other","not-url"]) assert.throws(() => oauthConfig({...environment,ADMIN_AUTH_ORIGIN:origin}));
  assert.equal(oauthConfig({...environment,ADMIN_AUTH_ORIGIN:"http://localhost:3000"}).secure,false);
});
test("authorization uses signed state, PKCE, fixed callback and short expiry", () => {
  const now = Date.now(); const flow = startOAuth(config,now);
  const url = new URL(flow.url); const state = url.searchParams.get("state");
  assert.equal(url.origin,"https://github.com");
  assert.equal(url.searchParams.get("code_challenge_method"),"S256");
  assert.equal(url.searchParams.get("redirect_uri"),config.callback);
  assert.ok(verifyFlow(flow.cookie,state,config,now));
  assert.equal(verifyFlow(flow.cookie,state+"x",config,now),null);
  assert.equal(verifyFlow(flow.cookie+"x",state,config,now),null);
  assert.equal(verifyFlow(flow.cookie,state,config,now+600000),null);
  assert.equal(verifyFlow(flow.cookie,state,{...config,secret:"different-secret"},now),null);
});
test("only the allowed immutable GitHub ID can obtain a session", async () => {
  const flow = {verifier:"fixture-verifier"};
  const calls = [];
  const mock = id => async (url,options) => {
    calls.push({url,options});
    return Response.json(url.includes("access_token") ? {access_token:"fixture-only-token"} : {id});
  };
  const session = await authenticateCode("fixture-code",flow,config,mock(12345));
  assert.equal(verifyOAuthSession(session,config),true);
  assert.equal(verifyOAuthSession(session+"x",config),false);
  assert.equal(verifyOAuthSession(session,{...config,userId:"99999"}),false);
  assert.equal(verifyOAuthSession(session,{...config,secret:"replacement-secret"}),false);
  assert.equal(calls[0].options.body.get("code_verifier"),flow.verifier);
  assert.equal(calls[0].options.body.get("client_secret"),config.clientSecret);
  assert.equal(calls[1].url,"https://api.github.com/user");
  assert.equal(calls[1].options.headers.Authorization,"Bearer fixture-only-token");
  await assert.rejects(authenticateCode("fixture-code",flow,config,mock(99999)),error=>error.status===403);
  await assert.rejects(authenticateCode("fixture-code",flow,config,mock("12345")),error=>error.status===403);
});
test("provider failures cannot create a session or echo provider secrets", async () => {
  await assert.rejects(authenticateCode("code",{},config,async()=>Response.json({error:config.clientSecret},{status:401})),error=>error.status===401 && !error.message.includes(config.clientSecret));
  await assert.rejects(authenticateCode("",{},config),error=>error.status===400);
  await assert.rejects(authenticateCode("code",{},config,async()=>Response.json({})),error=>error.status===401);
});

test("fixed host check accepts normalized internal request URLs without trusting forwarded hosts", async () => {
  const {matchesAuthHost} = await import("../app/lib/admin-oauth.js");
  assert.equal(matchesAuthHost(new Request("http://localhost/api/admin/callback",{headers:{host:"example.test"}}),config),true);
  assert.equal(matchesAuthHost(new Request("http://localhost/api/admin/callback",{headers:{host:"attacker.test","x-forwarded-host":"example.test"}}),config),false);
});
