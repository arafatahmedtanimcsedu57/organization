import assert from "node:assert/strict";
import { test } from 'vitest';

import { computeDisplayNames } from "./disambiguateNames.ts";
import type { Employee } from "./model.ts";

function emp(sysId: string, lastName: string, firstName: string): Employee {
  return { sysId, userId: sysId, lastName, firstName, title: "課員", departmentName: "本部" };
}

test("a unique last name is shown plainly", () => {
  const names = computeDisplayNames([emp("1", "鈴木", "花子")]);
  assert.equal(names.get("1"), "鈴木");
});

test("a last name shared by two people is disambiguated with each given-name initial", () => {
  const names = computeDisplayNames([emp("1", "加藤", "健一"), emp("2", "加藤", "優子")]);
  assert.equal(names.get("1"), "加藤(健)");
  assert.equal(names.get("2"), "加藤(優)");
});

test("a last name shared by three or more people disambiguates every one of them", () => {
  const names = computeDisplayNames([
    emp("1", "山本", "洸"),
    emp("2", "山本", "祥"),
    emp("3", "山本", "皓"),
  ]);
  assert.equal(names.get("1"), "山本(洸)");
  assert.equal(names.get("2"), "山本(祥)");
  assert.equal(names.get("3"), "山本(皓)");
});

test("a configured display override wins over the computed name, even when the last name collides", () => {
  const names = computeDisplayNames([
    emp("4df2151147314610d1f9cc39116d438f", "大西", "隆洋"),
    emp("2", "大西", "太郎"),
  ]);
  assert.equal(names.get("4df2151147314610d1f9cc39116d438f"), "大西【大阪】");
  assert.equal(names.get("2"), "大西(太)");
});
