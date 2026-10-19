import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coldBand, coldDays, headlines, heatBand, rainDays, windDays } from "./flags.ts";
import { byArea, dayMin, forecastAreaFor, parseForecastRow, type Forecast, type ForecastDay } from "./forecast.ts";

const day = (area: string, date: string, p: Partial<ForecastDay> = {}): ForecastDay => ({
  area_key: area,
  area_name: null,
  day_index: 0,
  forecast_date: date,
  day_name: null,
  overall_level: "GREEN",
  risks: {},
  min_temp_morning: 8,
  max_temp: 15,
  min_temp_night: 7,
  ice_day: false,
  ...p,
});

describe("forecast rows", () => {
  it("keeps only non-green risks and reads numbers", () => {
    const d = parseForecastRow({ area_key: "em_north", forecast_date: "2026-01-02", risks: { Wind: "aware", Frost: "GREEN", Snow: null }, min_temp_night: "-1.5", max_temp: null, ice_day: true });
    assert.deepEqual(d.risks, { Wind: "AWARE" });
    assert.equal(d.min_temp_night, -1.5);
    assert.equal(d.max_temp, null);
    assert.equal(d.ice_day, true);
    assert.equal(dayMin(d), -1.5);
  });
  it("maps MOM areas onto forecast areas and orders areas", () => {
    assert.equal(forecastAreaFor("Lincoln"), "lincolnshire");
    assert.equal(forecastAreaFor("WH"), "london_luton");
    assert.equal(forecastAreaFor("Nowhere"), undefined);
    const g = byArea([day("london_luton", "2026-01-02"), day("em_north", "2026-01-03"), day("em_north", "2026-01-02")]);
    assert.deepEqual(g.map((x) => x.key), ["em_north", "london_luton"]);
    assert.deepEqual(g[0].days.map((d) => d.forecast_date), ["2026-01-02", "2026-01-03"]);
  });
});

describe("cold", () => {
  it("bands the minimum at 3 and 0", () => {
    assert.equal(coldBand(3.5), "none");
    assert.equal(coldBand(3), "watch");
    assert.equal(coldBand(0.5), "watch");
    assert.equal(coldBand(0), "act");
    assert.equal(coldBand(-4), "act");
    assert.equal(coldBand(null), "none");
  });
  it("counts sub-zero runs across the history and the forecast", () => {
    const days = [day("em_north", "2026-01-03", { min_temp_night: -1 }), day("em_north", "2026-01-04", { min_temp_morning: -2, min_temp_night: 1 }), day("em_north", "2026-01-05", { min_temp_night: 2 })];
    const history = [{ area_key: "em_north", forecast_date: "2026-01-02", min: -3, ice_day: false }];
    const c = coldDays("em_north", days, history);
    assert.deepEqual(c.map((x) => x.subZeroRun), [2, 3, 0]);
    assert.deepEqual(c.map((x) => x.iceCheck), [false, true, false]);
    assert.equal(c[1].iceReason, "3 sub-zero days in a row");
    assert.equal(c[2].band, "watch");
  });
  it("a gap in dates breaks the run; two ice days trigger the check", () => {
    const days = [day("em_north", "2026-01-05", { min_temp_night: -1, ice_day: true }), day("em_north", "2026-01-06", { min_temp_night: -1, ice_day: true })];
    const history = [{ area_key: "em_north", forecast_date: "2026-01-01", min: -3, ice_day: false }];
    const c = coldDays("em_north", days, history);
    assert.deepEqual(c.map((x) => x.subZeroRun), [1, 2]);
    assert.deepEqual(c.map((x) => x.iceCheck), [false, true]);
    assert.match(c[1].iceReason ?? "", /ice days/);
  });
});

describe("rain, wind, heat", () => {
  it("flags flood checks at Aware and EWAT at Adverse or Extreme", () => {
    const r = rainDays("em_south", [day("em_south", "2026-06-01", { risks: { "Convective Rainfall": "AWARE" } }), day("em_south", "2026-06-02", { risks: { "Heavy Rain": "ADVERSE", Wind: "EXTREME" } }), day("em_south", "2026-06-03")]);
    assert.deepEqual(r.map((x) => [x.level, x.floodChecks, x.ewat]), [["AWARE", true, "none"], ["ADVERSE", true, "consider"], ["GREEN", false, "none"]]);
  });
  it("wind: BESR at Extreme, route proving from Adverse", () => {
    const w = windDays("em_north", [day("em_north", "2026-02-01", { risks: { Wind: "ADVERSE" } }), day("em_north", "2026-02-02", { risks: { Wind: "EXTREME" } })]);
    assert.deepEqual(w.map((x) => [x.besr, x.routeProving]), [[false, true], [true, true]]);
  });
  it("heat bands at 34, 39, 41 and 45", () => {
    assert.equal(heatBand(33.5), "none");
    assert.equal(heatBand(34), "command");
    assert.equal(heatBand(39), "ole_south");
    assert.equal(heatBand(41), "track_bsr");
    assert.equal(heatBand(45), "ole_40");
  });
});

describe("headlines", () => {
  const f: Forecast = {
    issue: { issued_at: null, valid_from: null, valid_to: null, summary_24h: null, summary_2_7: null, warnings: [] },
    days: [
      day("em_north", "2026-01-02", { min_temp_night: 2 }),
      day("em_north", "2026-01-03", { min_temp_night: -1, risks: { Wind: "ADVERSE" } }),
      day("em_south", "2026-01-02", { risks: { "Heavy Rain": "AWARE" } }),
      day("em_south", "2026-01-06", { risks: { "Heavy Rain": "EXTREME" } }),
    ],
    history: [],
  };
  it("names the hazards inside the horizon and the areas they touch", () => {
    const h = headlines(f, ["em_north", "em_south"], 3);
    assert.deepEqual(
      h.map((x) => [x.section, x.tone, x.areas, x.from]),
      [
        ["points", "red", ["em_north"], "2026-01-03"],
        ["rain", "amber", ["em_south"], "2026-01-02"],
        ["wind", "amber", ["em_north"], "2026-01-03"],
      ],
    );
  });
});
