import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { atRiskByTme, countByBand, crtBand, hotRailAreaFor, parseCrtRegister, siteRisks, type CrtSite, type HotRailForecast } from "./crt.ts";
import { parseCsv } from "./csv.ts";
import { parseHotRailItems, parseIssued, parseValidity, routeAreas } from "./hotrail.ts";
import { parseHotRailPdf } from "./hotrailPdf.ts";

const fixture = (name: string) => new URL(`./fixtures/${name}`, import.meta.url);

describe("csv", () => {
  it("reads quoted fields, doubled quotes, CRLF and a BOM", () => {
    const rows = parseCsv('﻿a,b\r\n1,"x, ""y"""\r\n,\r\n2,z\n');
    assert.deepEqual(rows, [
      { a: "1", b: 'x, "y"' },
      { a: "2", b: "z" },
    ]);
  });
});

describe("CRT register", () => {
  const sites = parseCrtRegister(readFileSync(fixture("crt-register.csv"), "utf8"));
  it("reads every site with its thresholds and five-day forecast", () => {
    assert.equal(sites.length, 250);
    const s = sites.find((x) => x.name === "Wymington")!;
    assert.equal(s.tme, "Bedford TME");
    assert.deepEqual([s.crt_w, s.crt_speed, s.crt_20], [56, 61, 66]);
    assert.deepEqual(s.rail_days, [19.58, 18.08, 17.51, 18.98, 17.28]);
    assert.equal(s.forecast_id, "86");
  });
  it("refuses a file that is not the register", () => {
    assert.throws(() => parseCrtRegister("a,b\n1,2"), /missing/);
  });
  it("bands rail temperature against the site's thresholds", () => {
    const s: Pick<CrtSite, "crt_w" | "crt_speed" | "crt_20"> = { crt_w: 53, crt_speed: 58, crt_20: 63 };
    assert.equal(crtBand(s, 52.9), "none");
    assert.equal(crtBand(s, 53), "warning");
    assert.equal(crtBand(s, 58), "speed");
    assert.equal(crtBand(s, 63), "twenty");
    assert.equal(crtBand(s, null), "none");
  });
  it("puts Luton TME in London North and the rest in East Midlands", () => {
    assert.equal(hotRailAreaFor({ tme: "Luton TME" }), "LNE and EM - London North");
    assert.equal(hotRailAreaFor({ tme: "Lincoln TME" }), "LNE and EM - East Midlands");
  });
});

describe("hot rail forecast", () => {
  it("reads the issue and validity lines", () => {
    assert.deepEqual(parseIssued("Forecast issued on Friday 04 Apr 2025 at 02:52 BST by Matt Andrews"), { at: "2025-04-04T02:52:00+01:00", by: "Matt Andrews" });
    assert.deepEqual(parseValidity("Valid for 06:00 Friday 04 Apr 2025 to 06:00 Wednesday 09 Apr 2025"), { from: "2025-04-04", to: "2025-04-09" });
  });
  it("rebuilds the panels from the sample PDF", async () => {
    const f = await parseHotRailPdf(new Uint8Array(readFileSync(fixture("hot-rail-forecast.pdf"))));
    assert.equal(f.valid_from, "2025-04-04");
    assert.equal(f.areas.length, 8);
    const em = f.areas.find((a) => a.name === "LNE and EM - East Midlands")!;
    assert.deepEqual(
      em.days.map((d) => [d.day, d.date, d.max_air, d.max_rail, d.time_of_max, d.period_above_46]),
      [
        ["Fri", "2025-04-04", 20.5, 33, "14:00", "N/A"],
        ["Sat", "2025-04-05", 16.5, 30, "14:00", "N/A"],
        ["Sun", "2025-04-06", 14.5, 28, "14:00", "N/A"],
        ["Mon", "2025-04-07", 15, 29, "14:00", "N/A"],
        ["Tue", "2025-04-08", 17, 31, "14:00", "N/A"],
      ],
    );
    const ln = f.areas.find((a) => a.name === "LNE and EM - London North")!;
    assert.deepEqual(ln.days.map((d) => d.max_rail), [33, 31, 28, 30, 31]);
    assert.deepEqual(routeAreas(f).map((a) => a.name), ["LNE and EM - East Midlands", "LNE and EM - London North"]);
  });
  it("tolerates a doubled text layer", () => {
    const items = [
      { str: "Valid for 06:00 Friday 04 Apr 2025 to 06:00 Wednesday 09 Apr 2025", x: 30, y: 700 },
      { str: "LNE and EM - East Midlands", x: 120, y: 600 },
      { str: "LNE and EM - East Midlands", x: 121, y: 600 },
      { str: "Fri", x: 52, y: 580 },
      { str: "20.5", x: 99, y: 580 },
      { str: "33", x: 151, y: 580 },
      { str: "14:00", x: 197, y: 580 },
      { str: "N/A", x: 249, y: 580 },
      { str: "Fri", x: 53, y: 580 },
    ];
    const f = parseHotRailItems(items);
    assert.equal(f.areas.length, 1);
    assert.deepEqual(f.areas[0].days, [{ day: "Fri", date: "2025-04-04", max_air: 20.5, max_rail: 33, time_of_max: "14:00", period_above_46: "N/A" }]);
  });
});

describe("site risks", () => {
  const site: CrtSite = { register: "Maintenance", depot: "IMDM Derby", tme: "Derby TME", name: "Test", elr: "SPC6", track_id: "1100", mileage: "1m", line_speed: "90mph", crt_w: 53, crt_speed: 58, crt_20: 63, rail_days: [50, 54, 59, null, 40], forecast_id: "1" };
  const hot: HotRailForecast = {
    issued_at: null,
    issued_by: null,
    valid_from: "2026-07-02",
    valid_to: null,
    areas: [{ name: "LNE and EM - East Midlands", days: [{ day: "Thu", date: "2026-07-02", max_air: 30, max_rail: 56, time_of_max: "14:00", period_above_46: "N/A" }, { day: "Sat", date: "2026-07-04", max_air: 36, max_rail: 64, time_of_max: "14:00", period_above_46: "13:00-16:00" }]}],
  };
  it("takes the higher of the register's and the area's forecast per date", () => {
    const [r] = siteRisks([site], "2026-07-01", hot);
    assert.deepEqual(
      r.days.map((d) => [d.date, d.site_rail, d.area_rail, d.rail, d.band]),
      [
        ["2026-07-01", 50, null, 50, "none"],
        ["2026-07-02", 54, 56, 56, "warning"],
        ["2026-07-03", 59, null, 59, "speed"],
        ["2026-07-04", null, 64, 64, "twenty"],
        ["2026-07-05", 40, null, 40, "none"],
      ],
    );
    assert.equal(r.worst, "twenty");
    assert.deepEqual(countByBand([r]), { none: 0, warning: 0, speed: 0, twenty: 1 });
    assert.deepEqual(atRiskByTme([r]).map((g) => g.tme), ["Derby TME"]);
  });
  it("works from the register alone", () => {
    const [r] = siteRisks([site], "2026-07-01", null);
    assert.equal(r.days.length, 5);
    assert.equal(r.worst, "speed");
  });
});
