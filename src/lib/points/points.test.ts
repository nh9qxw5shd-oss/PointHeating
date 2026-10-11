import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { comparePoints, groupByArea, isDuplicate, status, summarise, type PointRow } from "./points.ts";

const NOW = Date.parse("2026-12-01T12:00:00Z");
const H = 3_600_000;
const row = (area: string, point_number: string, ageH: number | null): PointRow => ({
  area,
  point_number,
  location: null,
  notes: null,
  last_treated_at: ageH == null ? null : new Date(NOW - ageH * H).toISOString(),
});

describe("status", () => {
  it("bands treatment age at 24 and 48 hours", () => {
    assert.deepEqual(status(row("Derby", "1", 3.9).last_treated_at, NOW), { rag: "green", hours: 3, label: "3h" });
    assert.equal(status(row("Derby", "1", 23.99).last_treated_at, NOW).rag, "green");
    assert.equal(status(row("Derby", "1", 24).last_treated_at, NOW).rag, "amber");
    assert.equal(status(row("Derby", "1", 47.9).last_treated_at, NOW).rag, "amber");
    assert.equal(status(row("Derby", "1", 48).last_treated_at, NOW).rag, "red");
    assert.deepEqual(status(null, NOW), { rag: "grey", hours: null, label: "Not treated" });
    assert.equal(status(row("Derby", "1", 71.5).last_treated_at, NOW).label, "71h");
    assert.equal(status(row("Derby", "1", 6492).last_treated_at, NOW).label, "270d");
  });
});

describe("lists", () => {
  const rows = [row("Nottingham", "123B", 50), row("Derby", "99", 1), row("Derby", "123A", null), row("Zed", "1", 30), row("Derby", "100", 25)];
  it("orders point numbers naturally within the fixed area order", () => {
    assert.deepEqual([...rows].sort(comparePoints).filter((r) => r.area === "Derby").map((r) => r.point_number), ["99", "100", "123A"]);
    assert.deepEqual(groupByArea(rows).map((g) => g.area), ["Derby", "Nottingham", "Zed"]);
  });
  it("counts each RAG band", () => {
    assert.deepEqual(summarise(rows, NOW), { total: 5, counts: { green: 1, amber: 2, red: 1, grey: 1 } });
  });
  it("blocks a duplicate point in the same area, ignoring case and spaces", () => {
    assert.equal(isDuplicate(rows, "Derby", " 123a "), true);
    assert.equal(isDuplicate(rows, "Nottingham", "123A"), false);
  });
});
