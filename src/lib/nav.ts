// The sections, shared by the sidebar, the mobile menu and the palette. Season is a hint for
// the sidebar grouping only; every section is reachable all year.

import { CloudRain, Flame, LayoutDashboard, type LucideIcon, Snowflake, Trees, Axe, Wind } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  desc: string;
  keywords: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Today",
    items: [{ href: "/", label: "Overview", short: "Overview", icon: LayoutDashboard, desc: "Seven-day forecast by area with what it asks of the desk", keywords: "home forecast today summary" }],
  },
  {
    label: "Winter",
    items: [{ href: "/points", label: "Ice and point heating", short: "Points", icon: Snowflake, desc: "Killfrost log for points without heaters, treatment watch, ice checks in at-risk tunnels", keywords: "points killfrost frost snow ice tunnels treat" }],
  },
  {
    label: "Summer",
    items: [{ href: "/heat", label: "Hot weather and CRT", short: "Heat", icon: Flame, desc: "CRT register and hot rail forecast: which sites hold a risk on which day", keywords: "heat crt rail temperature hot bsr krs" }],
  },
  {
    label: "All year",
    items: [
      { href: "/rain", label: "Rainfall, earthworks and flood sites", short: "Rain", icon: CloudRain, desc: "Flood site checks, earthworks risk sites and the high-risk operational sections", keywords: "rain flood earthworks drainage convective ewat" },
      { href: "/wind", label: "High winds", short: "Wind", icon: Wind, desc: "Wind thresholds, BESR, route proving after a no-train period", keywords: "wind gust besr storm proving" },
      { href: "/vegetation", label: "Vegetation and obscured signals", short: "Vegetation", icon: Trees, desc: "TI181 obscured signal process and the reading-distance chart", keywords: "vegetation trees signal obscured sighting" },
      { href: "/chainsaw", label: "Chainsaw competency", short: "Chainsaw", icon: Axe, desc: "Who holds the competency, where, and when it expires", keywords: "chainsaw staff competency expiry" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

export function navFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(i.href + "/")));
}
