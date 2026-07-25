import assert from "node:assert/strict";
import { test } from 'vitest';

import { CANONICAL_TITLES, findTitleByLabel, normalizeTitle } from "./config.ts";

test("normalizeTitle converts full-width digits to half-width", () => {
  assert.equal(normalizeTitle("主任２"), "主任2");
});

test("normalizeTitle leaves an already half-width title unchanged", () => {
  assert.equal(normalizeTitle("主任2"), "主任2");
});

test("normalizeTitle leaves titles without digits unchanged", () => {
  assert.equal(normalizeTitle("課長"), "課長");
});

test("CANONICAL_TITLES are ranked from highest to lowest authority", () => {
  const rankOf = (name: string) => CANONICAL_TITLES.find((t) => t.name === name)!.rank;
  assert.equal(rankOf("代表取締役"), 0);
  assert.ok(rankOf("本部長") < rankOf("事業部長"));
  assert.ok(rankOf("部長") < rankOf("課長"));
  assert.ok(rankOf("課長") < rankOf("担当課長"));
  assert.ok(rankOf("主任") < rankOf("主任2"));
  assert.ok(rankOf("主任2") < rankOf("課員"));
});

test("only 課員 is staff-level (rendered in the wrapped grid)", () => {
  assert.deepEqual(
    CANONICAL_TITLES.filter((t) => t.staffLevel).map((t) => t.name),
    ["課員"],
  );
});

test("findTitleByLabel matches the Japanese canonical name", () => {
  assert.equal(findTitleByLabel(CANONICAL_TITLES, "課長")?.id, "manager");
});

test("findTitleByLabel matches the English label", () => {
  assert.equal(findTitleByLabel(CANONICAL_TITLES, "Manager")?.id, "manager");
});

test("findTitleByLabel normalizes full-width digits so 主任２ resolves", () => {
  assert.equal(findTitleByLabel(CANONICAL_TITLES, "主任２")?.id, "senior-chief");
});

test("findTitleByLabel returns undefined for an unknown label", () => {
  assert.equal(findTitleByLabel(CANONICAL_TITLES, "宇宙飛行士"), undefined);
});
