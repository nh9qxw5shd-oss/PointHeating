// Reference data from the route's plans, kept in code until it has an owner in a table. Each list
// names its source document so a change there is traceable here. Forecast area keys are those of
// forecast.ts (FORECAST_AREAS).

// ------------------------------------------------------------ flood sites
// Sources: "Flood site monitoring" (EM sheet) and "LNEEM Flood Risk Mitigation Plan EWAT and
// ALARM" (East Midlands rows), Module D Extreme Rainfall §3.1–3.2 (derogations), Winter Working
// Arrangements §13.4 (EWMP sites authorised to run through floodwater).

export interface FloodSite {
  key: string;
  name: string;
  area_key: string;
  tme: string;
  elr: string;
  mileage: string;
  ors?: string;
  /** Remote condition monitoring or CCTV to watch before anyone travels. */
  monitoring: string | null;
  after_ewat: string;
  high_water: string;
  flooding: string;
  /** Module D derogation: trains may run through confined floodwater under Rule Book M3 M4 (generic) or the site's own instruction (bespoke). */
  derogation: "generic" | "bespoke" | null;
  /** Extreme Weather Management Plan in place (authorised running through floodwater after assessment). */
  ewmp: boolean;
  notes?: string;
}

export const FLOOD_SITES: FloodSite[] = [
  {
    key: "pen-green",
    name: "Corby Pen Green",
    area_key: "em_south",
    tme: "Leicester",
    elr: "GSM1",
    mileage: "80m 0826y – 80m 0877y",
    ors: "EM 3601.02",
    monitoring: "RCM water level at the inlet trash screen, Down side (Timeview)",
    after_ewat: "Routinely monitor the RCM for water levels at the inlet trash screen.",
    high_water: "Attend site at Pen Green Lane (aqueduct GSM1/21). Remove trash from the screen only if safe to do so; inspect the aqueduct; photograph the screen, upstream watercourse and attenuation ponds. Report to Route Control and the LNE/EM Drainage Team; monitor until levels subside.",
    flooding: "Clean the aqueduct channels with a rake to improve flow.",
    derogation: "bespoke",
    ewmp: true,
    notes: "If flooding is reported apply a caution until a MOM or DU member confirms conditions with the Geotech team. CML clear the trash screens above the cutting on a 12-hour rota.",
  },
  {
    key: "loxley-lane",
    name: "Loxley Lane",
    area_key: "em_north",
    tme: "Derby",
    elr: "NSS",
    mileage: "14m 0226y – 14m 0242y",
    ors: "EM 3501.01",
    monitoring: null,
    after_ewat: "Visit site. Check and clear debris from the road gullies at the level crossing.",
    high_water: "Report to Route Control and the LNE/EM Drainage Team; photograph; monitor until levels subside.",
    flooding: "Rod and prove the track drainage downstream of the level crossing.",
    derogation: "bespoke",
    ewmp: false,
    notes: "Level crossing flooding, not indicative of an earthworks issue: no earthworks speed needed if this floods.",
  },
  {
    key: "mill-hill",
    name: "Mill Hill",
    area_key: "london_luton",
    tme: "Luton",
    elr: "SPC1",
    mileage: "10m 0220y – 10m 0880y",
    ors: "EM 3201.01",
    monitoring: "CCTV and RCM in the Slows 6' chamber",
    after_ewat: "Visit site at SPC1/9m 1636y. Check the overflow pipe to the Slow Lines 6' is clear.",
    high_water: "Maintain a site presence. Report to Route Control and the LNE/EM Drainage Team; photograph; monitor until levels subside.",
    flooding: "Check and prove the Slow Lines 6' drain as far as its Up side outfall to the M1 drainage north of Mill Hill Broadway (SPC1/9m 0873y).",
    derogation: "generic",
    ewmp: false,
  },
  {
    key: "elstree",
    name: "Elstree",
    area_key: "london_luton",
    tme: "Luton",
    elr: "SPC1",
    mileage: "11m 0736y – 11m 0836y",
    ors: "EM 3201.01",
    monitoring: null,
    after_ewat: "No site action listed; a known flood risk site under the generic derogation.",
    high_water: "Report to Route Control and the LNE/EM Drainage Team.",
    flooding: "Rule Book M3 M4 applies while flooding is confined to the track; caution if water comes down an adjacent slope.",
    derogation: "generic",
    ewmp: false,
  },
  {
    key: "draycott",
    name: "Draycott",
    area_key: "em_north",
    tme: "Derby",
    elr: "SPC6",
    mileage: "122m 0692y – 123m 1341y",
    ors: "EM 3201.06",
    monitoring: "RCM at the Hopwell Road syphon (Timeview) and CCTV (telemetry-data viewer)",
    after_ewat: "Routinely monitor the RCM at the Hopwell Road syphon and the CCTV.",
    high_water: "Attend site. Check the sandbags at the canal inflow (52.89974, 1.35313) and replace if failed or removed. Check the syphon at Hopwell Road (SPC6/122m 1494y) and the downstream trash screens in the playing field. Check the track drainage outfall is flowing behind 118 Station Road.",
    flooding: "Pump from the Up cess chamber at SPC6/123m 0095y (north of Nooning Lane bridge SPC6/12) to the deep culvert chamber at the crest of the cutting.",
    derogation: "generic",
    ewmp: true,
  },
  {
    key: "stretton",
    name: "Stretton",
    area_key: "em_north",
    tme: "Derby",
    elr: "SPC8",
    mileage: "144m 1320y – 145m 0600y",
    ors: "EM 3201.19",
    monitoring: null,
    after_ewat: "Visit site. Check the watercourse at the crest of the Down side cutting (SPC8/145m 0661y – 145m 0964y); report, photograph, monitor.",
    high_water: "Maintain a site presence. Remove debris from the informal chicken-wire obstacles across the watercourse. Report to Route Control and the LNE/EM Drainage Team.",
    flooding: "Check the Down side outfall at 145m 0500y; rod and prove upstream from the outfall.",
    derogation: "generic",
    ewmp: false,
  },
  {
    key: "clay-cross",
    name: "Clay Cross",
    area_key: "em_north",
    tme: "Derby",
    elr: "SPC8",
    mileage: "147m 0450y – 147m 1270y",
    ors: "EM 3201.19",
    monitoring: "RCM at the trash screen (Timeview) and CCTV",
    after_ewat: "Routinely monitor the RCM at the trash screen and the CCTV.",
    high_water: "Visit site. Remove trash from the screen only if safe to do so; photograph; maintain a presence; monitor until levels subside.",
    flooding: "Check the Down side cess culvert, outfall and watercourse; rod and prove to improve flow.",
    derogation: "generic",
    ewmp: false,
  },
  {
    key: "kirkby-muxloe",
    name: "Kirkby Muxloe",
    area_key: "em_south",
    tme: "Leicester",
    elr: "KSL",
    mileage: "102m 0000y – 102m 0440y",
    ors: "EM 3625.01",
    monitoring: null,
    after_ewat: "Known flood risk site under the generic derogation; no site action listed.",
    high_water: "Report to Route Control and the LNE/EM Drainage Team.",
    flooding: "Rule Book M3 M4 applies while flooding is confined to the track; caution if water comes down an adjacent slope.",
    derogation: "generic",
    ewmp: false,
  },
  {
    key: "gonerby",
    name: "Gonerby",
    area_key: "lincolnshire",
    tme: "Lincoln",
    elr: "NOG1",
    mileage: "107m 0550y – 107m 1100y",
    ors: "EM 195.01",
    monitoring: null,
    after_ewat: "Known flood risk site under the generic derogation; no site action listed.",
    high_water: "Report to Route Control and the LNE/EM Drainage Team.",
    flooding: "Rule Book M3 M4 applies while flooding is confined to the track; caution if water comes down an adjacent slope.",
    derogation: "generic",
    ewmp: false,
  },
  {
    key: "clerkenwell",
    name: "Clerkenwell Tunnel",
    area_key: "london_luton",
    tme: "Luton",
    elr: "MCL",
    mileage: "Clerkenwell inlets",
    monitoring: null,
    after_ewat: "Proactive checks, monitoring and clearance of obstructions in the micro drains and inlets (Winter §13.2).",
    high_water: "Report to Route Control and the LNE/EM Drainage Team.",
    flooding: "EWMP site: after assessment by engineers, operators are authorised to run through floodwater; Control records it in CCIL.",
    derogation: null,
    ewmp: true,
  },
];

// ------------------------------------------------------ earthworks sites
// Source: "EM Earthworks Risk 040221" and Module D §4 (risk and actions where given).

export interface EarthworksSite {
  route: string;
  elr: string;
  mileage: string;
  location: string;
  ors: string;
  risk?: string;
  before?: string;
  after?: string;
}

export const EARTHWORKS_SITES: EarthworksSite[] = [
  { route: "Kettering North Jn – Manton Jn", elr: "GSM1", mileage: "76m 1320y", location: "Between Kettering North Jn and Geddington HABD", ors: "EM 3601.01", risk: "River Ise adjacent and under the site (SSSI): scour and degradation of the cess support wall.", after: "If the river has flooded, Route Engineering (G) review the EA website and flood warning database and send an examiner if required." },
  { route: "Kettering North Jn – Manton Jn", elr: "GSM1", mileage: "80m 0825y – 80m 0880y", location: "Penn Green", ors: "EM 3601.02", risk: "Flood risk from main river.", before: "RCM present: Tech Desk to monitor and follow the flood risk guide; check NR and third-party trash screens.", after: "See the flood risk guide." },
  { route: "Kettering North Jn – Manton Jn", elr: "GSM1", mileage: "82m 0220y – 82m 0330y", location: "Manton side of Corby Tunnel", ors: "EM 3601.02", risk: "Track geometry and embankment composition rather than weather.", before: "Check track drainage and outfall are working." },
  { route: "Manton Jn – Melton Jn", elr: "GSM1", mileage: "90m 0228y – 90m 0590y", location: "Manton Tunnel (Manton Jn side)", ors: "EM 3601.02", risk: "Track drainage issues; flooding at both portals.", before: "Check track drainage is working." },
  { route: "Manton Jn – Melton Jn", elr: "GSM2", mileage: "90m 1325y – 90m 1583y", location: "Manton Tunnel (Oakham side)", ors: "EM 3615.01", risk: "Track drainage issues; flooding at the high-mileage portal." },
  { route: "Syston South Jn – Melton Jn", elr: "GSM3", mileage: "104m 0330y", location: "Syston East – Syston South Curve", ors: "EM 3615.01", risk: "Silted culvert; unlikely to cause track problems.", before: "Check the culvert." },
  { route: "Radford Jn – Trowell Jn", elr: "MJT2", mileage: "127m 0330y", location: "Between Radford Jn and Moor Farm UWC", ors: "EM 3252.01" },
  { route: "Radford Jn – Trowell Jn", elr: "MJT2", mileage: "128m 0550y", location: "Between Radford Jn and Moor Farm UWC", ors: "EM 3252.01" },
  { route: "Nottingham East Jn – Lincoln", elr: "NOB1", mileage: "1m 1100y", location: "Colwick Woods", ors: "EM 3625.01" },
  { route: "North Stafford Jn – Stoke-on-Trent", elr: "NSS", mileage: "3m 1100y", location: "Caverswall side of Meir Tunnel", ors: "EM 3505.02" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "16m 0220y", location: "Between Radlett and Radlett aggregates siding", ors: "EM 3201.02" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "22m 0220y", location: "Between Sandridge OHNS and Harpenden Jn", ors: "EM 3201.03" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "26m 1210y – 26m 1430y", location: "Between Sandridge OHNS and Harpenden Jn", ors: "EM 3201.04" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "37m 0990y – 37m 1430y", location: "Between Harlington and Flitwick", ors: "EM 3201.05" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "42m 0330y", location: "Between Flitwick Jn and Ampthill Tunnel", ors: "EM 3201.06" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "42m 1320y", location: "Bedford side of Ampthill Tunnel", ors: "EM 3201.06" },
  { route: "St Pancras – Bedford", elr: "SPC1", mileage: "45m 0110y – 45m 0330y", location: "Between Ampthill Tunnel and Elstow sidings", ors: "EM 3201.06" },
  { route: "Bedford – Wellingborough", elr: "SPC2", mileage: "53m 0220y", location: "Between Bedford North Jn and Oakley HABD", ors: "EM 3201.07" },
  { route: "Wellingborough – Wigston South Jn", elr: "SPC3", mileage: "66m 0880y", location: "Between Wellingborough North Jn and Harrowden Jn", ors: "EM 3201.09" },
  { route: "Wellingborough – Wigston South Jn", elr: "SPC3", mileage: "81m 1100y", location: "South of Market Harborough", ors: "EM 3201.10" },
  { route: "Wellingborough – Wigston South Jn", elr: "SPC3", mileage: "88m 0110y – 88m 0550y", location: "Between East Langton AHB and Kilby Bridge Jn", ors: "EM 3201.10" },
  { route: "Wigston South Jn – Leicester", elr: "SPC4", mileage: "96m 0330y", location: "Between Wigston North Jn and Knighton Jn", ors: "EM 3201.12" },
  { route: "Leicester – Ratcliffe Jn", elr: "SPC5", mileage: "115m 0220y – 115m 0660y", location: "Sutton Bonington", ors: "EM 3201.14" },
  { route: "Sheet Stores Jn – Chellaston East Jn", elr: "SSJ1", mileage: "121m 0880y", location: "Sheet Stores side of Gateway sidings", ors: "EM 3520.01" },
  { route: "Trent East Jn – Clay Cross South Jn", elr: "TCC", mileage: "140m 1210y", location: "Clay Cross side of Morton Jn", ors: "EM 3207.03" },
  { route: "Wigston – Nuneaton", elr: "WNS", mileage: "8m 0000y", location: "Between Hinckley and Croft", ors: "EM 3232.02" },
];

// ---------------------------------------------------- operational sections
// Source: Module D, "Extreme Rainfall – East Midlands Operational Sections". High-risk sections
// take a 40 mph BESR in an Extreme Rainfall Event unless other mitigation is in place.

export interface OpSection {
  section: string;
  from: string;
  to: string;
  risk: "Low" | "Medium" | "High";
  restriction?: string;
  area_key: string;
}

export const OP_SECTIONS: OpSection[] = [
  { section: "170.1", from: "Route boundary (Werrington)", to: "Sleaford North", risk: "Low", area_key: "lincolnshire" },
  { section: "170.2", from: "Sleaford North", to: "Lincoln", risk: "Medium", area_key: "lincolnshire" },
  { section: "170.3", from: "Lincoln", to: "Route boundary (Gainsborough)", risk: "High", restriction: "40 mph blanket ESR", area_key: "lincolnshire" },
  { section: "180.1", from: "Sleaford West Jn", to: "Sleaford North Jn", risk: "Low", area_key: "lincolnshire" },
  { section: "185.1", from: "Allington West Jn", to: "Sleaford", risk: "High", restriction: "40 mph blanket ESR", area_key: "lincolnshire" },
  { section: "185.2", from: "Sleaford", to: "Boston", risk: "Low", area_key: "lincolnshire" },
  { section: "185.3", from: "Boston", to: "Skegness", risk: "Low", area_key: "lincolnshire" },
  { section: "195.1", from: "Route boundary (Grantham)", to: "Allington West Jn", risk: "High", restriction: "40 mph blanket ESR", area_key: "lincolnshire" },
  { section: "200.1", from: "Route boundary (Market Rasen)", to: "Pelham Street Jn", risk: "Low", area_key: "lincolnshire" },
  { section: "206.1", from: "Route boundary (Newark flat crossing)", to: "West Holmes", risk: "Low", area_key: "lincolnshire" },
  { section: "3201.01", from: "St Pancras", to: "Radlett Jn", risk: "Medium", area_key: "london_luton" },
  { section: "3201.02", from: "Radlett Jn", to: "Radlett Redlands stone terminal", risk: "High", restriction: "40 mph blanket ESR on the outer lines only (Down Fast / Up Slow)", area_key: "london_luton" },
  { section: "3201.03", from: "Radlett Redlands stone terminal", to: "Harpenden Jn", risk: "Medium", area_key: "london_luton" },
  { section: "3201.04", from: "Harpenden Jn", to: "Leagrave Jn", risk: "Medium", area_key: "london_luton" },
  { section: "3201.05", from: "Leagrave Jn", to: "Flitwick Jn", risk: "Medium", area_key: "london_luton" },
  { section: "3201.06", from: "Flitwick Jn", to: "Bedford", risk: "Medium", area_key: "london_luton" },
  { section: "3201.07", from: "Bedford", to: "Sharnbrook Jn", risk: "Low", area_key: "em_south" },
  { section: "3201.08", from: "Sharnbrook Jn", to: "Wellingborough", risk: "Medium", area_key: "em_south" },
  { section: "3201.09", from: "Wellingborough", to: "Kettering", risk: "Medium", area_key: "em_south" },
  { section: "3201.10", from: "Kettering North Jn", to: "Market Harborough", risk: "Medium", area_key: "em_south" },
  { section: "3201.11", from: "Market Harborough", to: "Wigston North Jn", risk: "Low", area_key: "em_south" },
  { section: "3201.12", from: "Wigston North Jn", to: "Leicester", risk: "Low", area_key: "em_south" },
  { section: "3201.13", from: "Leicester", to: "Loughborough", risk: "Medium", area_key: "em_south" },
  { section: "3201.14", from: "Loughborough", to: "Trent South", risk: "Medium", area_key: "em_north" },
  { section: "3201.15", from: "Trent South", to: "Sawley CCTV", risk: "Medium", area_key: "em_north" },
  { section: "3201.16", from: "Sawley CCTV", to: "Spondon", risk: "High", restriction: "40 mph blanket ESR if no watchman in place", area_key: "em_north" },
  { section: "3201.17", from: "Spondon", to: "Derby", risk: "Medium", area_key: "em_north" },
  { section: "3201.18", from: "Derby", to: "Ambergate Jn", risk: "High", restriction: "40 mph blanket ESR", area_key: "em_north" },
  { section: "3201.19", from: "Ambergate Jn", to: "Route boundary (Chesterfield South)", risk: "High", restriction: "40 mph blanket ESR", area_key: "em_north" },
  { section: "3204.01", from: "Trent South Jn", to: "Nottingham", risk: "Low", area_key: "em_north" },
  { section: "3207.01", from: "Trent East Jn", to: "Trowell Jn", risk: "Low", area_key: "em_north" },
  { section: "3207.02", from: "Trowell Jn", to: "Alfreton", risk: "Low", area_key: "em_north" },
  { section: "3207.03", from: "Alfreton", to: "Clay Cross North Jn", risk: "Medium", area_key: "em_north" },
  { section: "3232.01", from: "Wigston North Jn", to: "Narborough", risk: "Low", area_key: "em_south" },
  { section: "3232.02", from: "Narborough", to: "Route boundary (Rugby)", risk: "Low", area_key: "em_south" },
  { section: "3246.01", from: "Ambergate Jn", to: "Matlock", risk: "High", restriction: "40 mph blanket ESR", area_key: "em_north" },
  { section: "3252.01", from: "Mansfield Jn", to: "Trowell Jn", risk: "Low", area_key: "em_north" },
  { section: "3255.01", from: "Radford Jn", to: "Kirkby Lane End", risk: "Low", area_key: "em_north" },
  { section: "3273.1", from: "Codnor Park Jn", to: "Kirkby Lane End", risk: "Medium", area_key: "em_north" },
  { section: "3273.2", from: "Kirkby Lane End", to: "Route boundary (Shirebrook)", risk: "Medium", area_key: "em_north" },
  { section: "3340.1", from: "Route boundary (Nuneaton)", to: "Wichnor Jn", risk: "Low", area_key: "em_north" },
  { section: "3501.1", from: "Derby London Road", to: "Wichnor Jn", risk: "Low", area_key: "em_north" },
  { section: "3501.2", from: "Wichnor Jn", to: "Route boundary", risk: "Low", area_key: "em_north" },
  { section: "3505.1", from: "North Stafford Jn", to: "Uttoxeter", risk: "Low", area_key: "em_north" },
  { section: "3505.2", from: "Uttoxeter", to: "Route boundary", risk: "Medium", area_key: "em_north" },
  { section: "3520.1", from: "Sheet Stores Jn", to: "Stenson Jn", risk: "Low", area_key: "em_north" },
  { section: "3525.1", from: "Knighton South Jn", to: "Bardon Hill", risk: "Medium", area_key: "em_south" },
  { section: "3525.2", from: "Bardon Hill", to: "Leicester Jn", risk: "High", restriction: "40 mph blanket ESR", area_key: "em_south" },
  { section: "3601.1", from: "Kettering North Jn", to: "Corby", risk: "Low", area_key: "em_south" },
  { section: "3601.2", from: "Corby", to: "Manton Jn", risk: "High", restriction: "40 mph blanket ESR", area_key: "em_south" },
  { section: "3615.1", from: "Syston East Jn", to: "Manton Jn", risk: "Low", area_key: "em_south" },
  { section: "3615.2", from: "Manton Jn", to: "Route boundary (Peterborough)", risk: "Low", area_key: "em_south" },
  { section: "3625.1", from: "Nottingham East Jn", to: "Route boundary (Newark flat crossing)", risk: "Low", area_key: "em_north" },
  { section: "3635.1", from: "Netherfield Jn", to: "Allington West", risk: "Medium", area_key: "em_north" },
];

// ----------------------------------------------------------- ice and cold
// Sources: Appendix G (tunnels at risk of ice formation; the most frequent in bold in the
// source), Appendix K (points without heaters requiring MOM attendance), Winter §12.5 (points
// needing a snowman before KRS).

export interface IceTunnel {
  name: string;
  bridge: string;
  elr: string;
  ole: boolean;
  area_key: string;
  frequent?: boolean;
}

export const ICE_TUNNELS: IceTunnel[] = [
  { name: "Alfreton", bridge: "63", elr: "SPC8", ole: false, area_key: "em_north" },
  { name: "Clay Cross", bridge: "68", elr: "SPC8", ole: false, area_key: "em_north" },
  { name: "Corby", bridge: "24", elr: "GSM1", ole: false, area_key: "em_south" },
  { name: "Meir", bridge: "20", elr: "NSS", ole: false, area_key: "em_north" },
  { name: "Milford", bridge: "21", elr: "SPC8", ole: false, area_key: "em_north" },
  { name: "Willersley", bridge: "24", elr: "AJM1", ole: false, area_key: "em_north" },
  { name: "Ampthill", bridge: "168", elr: "SPC1", ole: true, area_key: "london_luton" },
  { name: "Tottenham Curve No 1", bridge: "1", elr: "JRT1", ole: false, area_key: "london_luton" },
  { name: "Chesterfield South Jn", bridge: "80", elr: "SPC9", ole: false, area_key: "em_north" },
  { name: "Bedford", bridge: "185", elr: "SPC5", ole: true, area_key: "london_luton" },
  { name: "Carlton Road Jn (Lismore Circus)", bridge: "26", elr: "SPC1", ole: true, area_key: "london_luton" },
  { name: "Harpenden Jn (Walker's Road)", bridge: "114", elr: "SPC1", ole: true, area_key: "london_luton" },
  { name: "Harpenden Jn (Skew Bridge)", bridge: "115", elr: "SPC1", ole: true, area_key: "london_luton" },
  { name: "Sharnbrook", bridge: "1", elr: "SPC2", ole: true, area_key: "em_south" },
  { name: "Whatstandwell", bridge: "17", elr: "AJM1", ole: false, area_key: "em_north" },
  { name: "Manton", bridge: "48", elr: "GSM2", ole: false, area_key: "em_south" },
];

export interface UnheatedPoints {
  name: string;
  area: string; // MOM area of the points logbook
  attended_by: string;
}

export const UNHEATED_POINTS: UnheatedPoints[] = [
  { name: "Limbury GF", area: "WH", attended_by: "MOM" },
  { name: "Leagrave 884 A/B", area: "WH", attended_by: "MOM" },
  { name: "Mantle Lane No 12 points", area: "Leicester", attended_by: "MOM" },
  { name: "Corby North 654 A/B", area: "Kettering", attended_by: "MOM" },
  { name: "Alrewas 3 points", area: "Derby", attended_by: "MOM" },
  { name: "Meadow Lane 738 and 739 points", area: "Nottingham", attended_by: "MOM" },
  { name: "Sleaford 8 points", area: "Lincoln", attended_by: "Sleaford P-way (MOM not required)" },
];

export const SNOW_POINTS = ["Derby St Mary's", "Etches Park", "Sheet Stores", "Sileby (strategic freight)", "Leicester North Jn", "Wigston North", "Silkstream (Slows, freight access to Dudding Hill)", "St Pancras", "Bedford Carriage Sidings", "Cauldwell Depot (access from Bedford stabling)", "Lincoln Station (Lincoln DU)"];

// ------------------------------------------------------------------ wind
// Source: Module B §3 (lines with a daily no-train period, route proving after Adverse or
// Extreme winds overnight) and Appendix A (MOM, Off-Track and chainsaw resource locations).

export const NO_TRAIN_LINES: { line: string; area_key: string }[] = [
  { line: "North Staffs Jn – Stoke Jn", area_key: "em_north" },
  { line: "Ambergate Jn – Matlock", area_key: "em_north" },
  { line: "Grantham – Skegness", area_key: "lincolnshire" },
  { line: "Nottingham – Grantham", area_key: "em_north" },
  { line: "Mansfield Jn – Mansfield / Shirebrook", area_key: "em_north" },
  { line: "Radford Jn – Trowell Jn", area_key: "em_north" },
  { line: "Manton – Corby / Kettering", area_key: "em_south" },
];

export const MOM_RESOURCE_LOCATIONS = ["Kentish Town", "Elstree", "Bedford", "Kettering", "Leicester", "Nottingham", "Derby", "Lincoln"];
export const CHAINSAW_RESOURCE_LOCATIONS = ["Bedford", "Leicester", "Derby", "Lincoln"];

// ------------------------------------------------------------------ heat
// Source: Extreme Heat Operations Plan 2026 §4.2.

export const HEAT_JUNCTIONS_NORMAL = ["Luton North", "Leagrave", "Flitwick", "Wellingborough South *", "Wellingborough North", "Harrowden", "Sharnbrook", "Radlett *", "Ironville", "Blackwell South", "Codnor Park", "Clay Cross", "Tapton"];
export const HEAT_JUNCTIONS_NOTE = "* Wellingborough South and Radlett: above 34 °C an operational decision weighs keeping the junction in normal against regular operation.";
