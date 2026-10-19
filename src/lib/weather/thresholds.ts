// The alert tables the desk works to, as published, for the guidance panels. Numbers only; the
// flags that use them live in flags.ts.

export interface ThresholdRow {
  level: string;
  cells: string[];
}

export interface ThresholdTable {
  title: string;
  source: string;
  columns: string[];
  rows: ThresholdRow[];
  note?: string;
}

/** Winter Working Arrangements 2025 §6.3. Ambient air temperature 1.25 m above ground. */
export const FROST_ALERTS: ThresholdTable = {
  title: "Frost alert levels",
  source: "Winter Working Arrangements East Midlands 2025, §6.3",
  columns: ["Wind under 12 mph", "Wind over 12 mph"],
  rows: [
    { level: "Normal", cells: ["Warmer than 0 °C", "Warmer than 0 °C"] },
    { level: "Aware", cells: ["0 to −2.9 °C", "0 to −0.9 °C"] },
    { level: "Adverse", cells: ["−3 to −6.9 °C", "−1 to −2.9 °C"] },
    { level: "Extreme", cells: ["−7 °C or below", "−3 °C or below"] },
  ],
};

/** Winter §6.4. */
export const SNOW_ALERTS: ThresholdTable = {
  title: "Snow alert levels",
  source: "Winter Working Arrangements East Midlands 2025, §6.4",
  columns: ["Daily snowfall", "Drifting risk", "Wind over 20 mph"],
  rows: [
    { level: "Normal", cells: ["under 2 cm", "None", "—"] },
    { level: "Aware", cells: ["2 – 4.9 cm", "Low", "Adverse"] },
    { level: "Adverse", cells: ["5 – 14.9 cm", "Medium", "Extreme"] },
    { level: "Extreme", cells: ["15 cm or more", "High", "Extreme"] },
  ],
  note: "Extreme forecast: the duty SNDM convenes an EWAT for snow; Adverse: an EWAT-lite is considered.",
};

/** Winter §6.9: the Convective Analysis Tool by Operational Route Section. */
export const CAT_THRESHOLDS: ThresholdTable = {
  title: "Convective rainfall (CAT) thresholds, mm",
  source: "Winter Working Arrangements East Midlands 2025, §6.9; Module D §2.1",
  columns: ["In 1 hour", "In 3 hours"],
  rows: [
    { level: "Normal", cells: ["0 – 9.9", "0 – 19.9"] },
    { level: "Aware", cells: ["10 – 14.9", "20 – 29.9"] },
    { level: "Adverse", cells: ["15 – 19.9", "30 – 39.9"] },
    { level: "Extreme", cells: ["20 or more", "40 or more"] },
  ],
  note: "An Extreme Rainfall Event for earthworks and structures is more than 27.5 mm in one hour; CAT alerts an emerging event at 40 mm in three hours. Only the high-risk ORSs take a speed restriction.",
};

/** Module B §2.3.1. */
export const WIND_THRESHOLDS: ThresholdTable = {
  title: "High wind thresholds",
  source: "Joint Extreme Weather Plan Module B, Extreme High Winds, §2.3.1",
  columns: ["Forecast gusts", "Forecast mean", "Action"],
  rows: [
    { level: "Normal", cells: ["up to 39 mph", "up to 29 mph", "None"] },
    { level: "Aware", cells: ["40 – 49 mph", "30 – 39 mph", "Be aware higher speeds may be reached"] },
    { level: "Adverse", cells: ["50 – 59 mph", "40 – 49 mph", "Be aware higher speeds may be reached; EWAT if borderline, unseasonal or the first storm"] },
    { level: "Extreme", cells: ["60 mph or over", "50 mph or over", "50 mph BESR for all trains in the forecast area"] },
    { level: "Extreme", cells: ["90 mph or over", "—", "All services suspended in the forecast area (considered from 70 mph)"] },
  ],
  note: "Freight: gusts over 40 mph bring a Rail Freight Wind Warning for FEA wagons with empty containers (NOC, NR/L3/OPS/021/05 §5).",
};

/** Extreme Heat Operations Plan 2026 Appendix A. */
export const HEAT_THRESHOLDS: ThresholdTable = {
  title: "Extreme heat triggers (forecast air temperature)",
  source: "East Midlands Extreme Heat Operations Plan 2026 v1.6, §3 and Appendix A",
  columns: ["Strategic command", "Infrastructure", "Junctions, loops, sidings"],
  rows: [
    { level: "34 – 38 °C", cells: ["Yes", "Localised CRT sites only", "Listed junctions in normal"] },
    { level: "39 – 40 °C", cells: ["Yes", "60 mph OLE BSR south of Bedford (11:00–22:00)", "All points south of Bedford in normal (Bedford excepted); no changes of line south of Bedford"] },
    { level: "41 °C +", cells: ["Yes", "40/70 mph track BSR all track (14:00–20:00), 60 mph OLE BSR north of Bedford; CRT and OLE sites over and above", "As above"] },
    { level: "45 °C +", cells: ["Yes", "40 mph OLE BSR, both OLE types", "As above"] },
  ],
  note: "Track CRT targets: Bedford IMDM 57 °C for CRT 40/70; Derby IME 53 °C. Most CRT sites up to 59 °C rail (about 39 °C air) are planned to be raised before significant heat.",
};

/** Winter §7.6.2. */
export const EWAT_LITE_TRIGGERS: { hazard: string; alert: string; when: string; action: string }[] = [
  { hazard: "Wind", alert: "Adverse", when: "Hourly gust over 50 mph, all year", action: "EWAT" },
  { hazard: "Wind", alert: "Adverse", when: "Hourly gust over 50 mph in May to October", action: "EWAT-lite" },
  { hazard: "Wind", alert: "Adverse", when: "Easterly, or a long spell without Adverse wind alerts, or with Adverse rain", action: "EWAT-lite to be considered" },
  { hazard: "Wind", alert: "Aware", when: "Hourly gusts over 40 mph in May to October", action: "EWAT-lite to be considered" },
  { hazard: "Rain", alert: "Adverse", when: "Adverse rain alerts two days or more with soil moisture index over 1.3 near high-risk flood sites", action: "EWAT-lite to be considered; EWMP for high-risk flood sites" },
  { hazard: "Rain", alert: "Adverse", when: "Adverse rain on dry ground (SMI under 0.3)", action: "EWAT-lite" },
  { hazard: "Snow", alert: "Adverse", when: "Melting coupled with further rain", action: "EWAT-lite to be considered; snow melting procedure" },
];

/** The documents behind each section, as held in the route's weather resilience folder. */
export interface SourceDoc {
  title: string;
  ref?: string;
  note?: string;
}

export const SOURCES: Record<"points" | "heat" | "rain" | "wind" | "vegetation" | "chainsaw", SourceDoc[]> = {
  points: [
    { title: "Winter Working Arrangements East Midlands 2025", ref: "NR/L3/OPS/021/03/EM issue 3, 10 Dec 2025", note: "§6.3 frost alerts, §6.5 alert requirements, §9 ice in tunnels, §12 points heating, §12.5 snow points" },
    { title: "Appendix K, Points without heaters requiring MOM attendance", note: "Every 48 hours during sub-zero spells" },
    { title: "Appendix G, Tunnels at risk of ice formation" },
    { title: "Tunnel Ice Management Process (flowchart)", note: "Yellow alert at 06:00 on cold alerts; Red when forecast below 1 °C for more than 48 h; patrols within 24 h" },
    { title: "Management of Ice Risk in Tunnels, Control Brief v2" },
    { title: "Winter Safety Brief" },
  ],
  heat: [
    { title: "Extreme Heat Operations Plan 2026 (Appendix E to the Summer Working Arrangements)", ref: "v1.6, 27 May 2026" },
    { title: "Summer Working Arrangements East Midlands 2026", ref: "v3" },
    { title: "Managing Track in Hot Weather", ref: "NR/L2/TRK/001/mod14 issue 9", note: "Heat speeds 40/70 mph since May 2026 (were 30/60)" },
    { title: "National CRT RAG Report (Power BI)", note: "The register export this section reads" },
    { title: "Hot Rail Forecast (MetDesk)", note: "The PDF this section reads" },
    { title: "East Midlands Summer Briefing" },
  ],
  rain: [
    { title: "Joint Extreme Weather Plan Module D, Extreme Rainfall (Frontal / Convective)", ref: "4 Jul 2022", note: "Definition, EWAT timeline, flood and earthworks sites, operational sections" },
    { title: "LNEEM Flood Risk Mitigation Plan, EWAT and alarm actions" },
    { title: "Flood site monitoring (EM)" },
    { title: "EM Earthworks Risk register", ref: "4 Feb 2021" },
    { title: "LNE EM Risk Mitigation Process for Earthworks", ref: "v1.2" },
    { title: "Flooding, Management of Drainage", ref: "NR/L3/OPS/021/12" },
    { title: "Earthworks", ref: "NR/L3/OPS/021/08" },
  ],
  wind: [
    { title: "Joint Extreme Weather Plan Module B, Extreme High Winds", ref: "v1.01, 15 Dec 2021" },
    { title: "High Winds", ref: "NR/L3/OPS/021/05" },
    { title: "Extreme Weather Response Process", ref: "NR/L3/OPS/021/13" },
    { title: "Route and Line Proving Process", ref: "NR/L3/OPS/045/3.41" },
  ],
  vegetation: [
    { title: "Management of Obscured Signals", ref: "NR/SMTH/Part05/Module/S22, TI 181, 9 Mar 2023" },
    { title: "Signal Reference Values (visibility charts)", ref: "NR/SMS/PartZ/Z01" },
    { title: "Wrong Side Failure Test Guides T037 / T038", ref: "NR/SMTH/Part08" },
    { title: "TI181 Management of Obscured Signals briefing" },
    { title: "Tree Management", ref: "NR/L3/OPS/021/07" },
    { title: "Lineside vegetation", ref: "NR/L2/SIG/10047" },
  ],
  chainsaw: [{ title: "Chainsaw competent operations staff register", note: "Name, location, expiry, course bookings" }],
};
