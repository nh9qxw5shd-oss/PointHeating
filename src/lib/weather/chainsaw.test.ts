import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expiryStatus, parseChainsawCsv, summariseExpiry, toIsoDate } from "./chainsaw.ts";
import { parseCsv } from "./csv.ts";
import { classify, secondsObscured, viewingDistance } from "./signals.ts";

const NOW = Date.parse("2026-10-19T12:00:00Z");

describe("chainsaw expiry", () => {
  it("bands at expiry and six months", () => {
    assert.equal(expiryStatus("2026-10-18", NOW).rag, "red");
    assert.equal(expiryStatus("2026-10-19", NOW).rag, "amber");
    assert.equal(expiryStatus("2027-04-20", NOW).rag, "amber");
    assert.equal(expiryStatus("2027-04-21", NOW).rag, "green");
    assert.equal(expiryStatus(null, NOW).rag, "grey");
  });
  it("reads UK and US dates", () => {
    assert.equal(toIsoDate("28/11/2025"), "2025-11-28");
    assert.equal(toIsoDate("11/28/2025"), "2025-11-28");
    assert.equal(toIsoDate("12/18/2023", true), "2023-12-18");
    assert.equal(toIsoDate("2/10/2024", true), "2024-02-10");
    assert.equal(toIsoDate("2/10/2024"), "2024-10-02");
    assert.equal(toIsoDate("2024-02-10"), "2024-02-10");
    assert.equal(toIsoDate("x"), null);
  });
  it("imports the register layout and skips the sub-heading rows", () => {
    const rows = parseCsv("NAME,LOCATION,EXPIRY DATE,COMMENTS\nR HODGSON,NOTTINGHAM,12/18/2023,BOOKED JAN 24\n,EXPIRES WITHIN 6 MONTHS,,\nNAME,LOCATION,COURSE BOOKED,DATE(S)\n");
    const out = parseChainsawCsv(rows);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0], { name: "R HODGSON", location: "NOTTINGHAM", expiry_date: "2023-12-18", comments: "BOOKED JAN 24", course_booked: null, course_dates: null });
    assert.deepEqual(summariseExpiry(out, NOW), { green: 0, amber: 0, red: 1, grey: 0 });
  });
});

describe("signal sighting", () => {
  it("uses 0.489 yards per mph-second", () => {
    assert.deepEqual(viewingDistance(100, 2), { yards: 98, metres: 89 });
    assert.deepEqual(viewingDistance(60, 10), { yards: 293, metres: 268 });
    assert.ok(Math.abs(secondsObscured(50, 49) - 2.004) < 0.01);
  });
  it("classifies an obscuration", () => {
    assert.equal(classify(100, 100, true, false).risk, "high");
    assert.equal(classify(100, 50, true, false).risk, "low");
    assert.equal(classify(100, 50, true, false).wrongSide, true);
    assert.equal(classify(100, 50, false, true).category, "negligible");
    assert.equal(classify(100, 50, false, false).category, "becoming");
  });
});
