import assert from "node:assert/strict";
import { test } from 'vitest';

import { normalizeTitle, POSITION_RANK, STAFF_RANK } from "./config.ts";

test("normalizeTitle converts full-width digits to half-width", () => {
  assert.equal(normalizeTitle("主任２"), "主任2");
});

test("normalizeTitle leaves an already half-width title unchanged", () => {
  assert.equal(normalizeTitle("主任2"), "主任2");
});

test("normalizeTitle leaves titles without digits unchanged", () => {
  assert.equal(normalizeTitle("課長"), "課長");
});

test("POSITION_RANK orders positions from highest to lowest authority", () => {
  assert.equal(POSITION_RANK.indexOf("代表取締役"), 0);
  assert.ok(POSITION_RANK.indexOf("本部長") < POSITION_RANK.indexOf("事業部長"));
  assert.ok(POSITION_RANK.indexOf("部長") < POSITION_RANK.indexOf("課長"));
  assert.ok(POSITION_RANK.indexOf("課長") < POSITION_RANK.indexOf("担当課長"));
  assert.ok(POSITION_RANK.indexOf("主任") < POSITION_RANK.indexOf("主任2"));
  assert.ok(POSITION_RANK.indexOf("主任2") < POSITION_RANK.indexOf("課員"));
});

test("STAFF_RANK points at 課員, the boundary between managers and staff", () => {
  assert.equal(POSITION_RANK[STAFF_RANK], "課員");
});
