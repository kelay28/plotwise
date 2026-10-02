import { getCrop, type Crop } from "./crops";

// Approximate average frost dates (month, day) by USDA zone.
export const ZONES: Record<string, { last: [number, number]; first: [number, number] }> = {
  "3a": { last: [5, 25], first: [9, 10] }, "3b": { last: [5, 15], first: [9, 20] },
  "4a": { last: [5, 10], first: [9, 25] }, "4b": { last: [5, 5], first: [10, 1] },
  "5a": { last: [4, 30], first: [10, 5] }, "5b": { last: [4, 25], first: [10, 10] },
  "6a": { last: [4, 20], first: [10, 15] }, "6b": { last: [4, 15], first: [10, 20] },
  "7a": { last: [4, 10], first: [10, 25] }, "7b": { last: [4, 5], first: [10, 30] },
  "8a": { last: [3, 25], first: [11, 10] }, "8b": { last: [3, 15], first: [11, 15] },
  "9a": { last: [2, 25], first: [11, 30] }, "9b": { last: [2, 10], first: [12, 10] },
  "10a": { last: [1, 30], first: [12, 15] }, "10b": { last: [1, 15], first: [12, 20] },
};

export const ZONE_KEYS = Object.keys(ZONES);
const DAY = 86400000;

export function frostDates(zone: string, year: number) {
  const z = ZONES[zone] ?? ZONES["7b"]!;
  return { last: new Date(year, z.last[0] - 1, z.last[1]), first: new Date(year, z.first[0] - 1, z.first[1]) };
}

const addWeeks = (d: Date, w: number) => new Date(d.getTime() + w * 7 * DAY);

export function plantingWindows(crop: Crop, zone: string, year: number) {
  const f = frostDates(zone, year);
  const out: { label: string; start: Date; end: Date }[] = [];
  if (crop.spring) out.push({ label: "Spring", start: addWeeks(f.last, crop.spring[0]), end: addWeeks(f.last, crop.spring[1]) });
  if (crop.fall) out.push({ label: "Fall", start: addWeeks(f.first, crop.fall[0]), end: addWeeks(f.first, crop.fall[1]) });
  return out;
}

export function inWindowNow(crop: Crop, zone: string, today = new Date()) {
  return plantingWindows(crop, zone, today.getFullYear()).find((w) => today >= w.start && today <= w.end);
}

/** Typical planting date when the user didn't record one: midpoint of the latest window already started. */
export function typicalPlantDate(slug: string, zone: string, ref = new Date()) {
  const crop = getCrop(slug);
  const cands = [ref.getFullYear(), ref.getFullYear() - 1]
    .flatMap((y) => plantingWindows(crop, zone, y))
    .map((w) => new Date((w.start.getTime() + w.end.getTime()) / 2))
    .filter((d) => d <= ref)
    .sort((a, b) => b.getTime() - a.getTime());
  return cands[0] ?? ref;
}

/** Perennial fruit: month (1-12) the first real crop usually ripens, used instead of a 365-day "maturity". */
const FRUIT_MONTH: Record<string, number> = { blueberry: 6, fig: 8, strawberry: 5, lavender: 6 };

export function harvestInfo(p: { crop_slug: string; planted_on: string | null; days_to_maturity: number | null; created_at: string }, zone: string) {
  const crop = getCrop(p.crop_slug);
  const estimatedDate = !p.planted_on;
  const planted = p.planted_on ? new Date(p.planted_on + "T12:00:00") : typicalPlantDate(p.crop_slug, zone, new Date(p.created_at));
  const days = p.days_to_maturity ?? crop.days;
  let harvest = new Date(planted.getTime() + days * DAY);
  const fm = FRUIT_MONTH[p.crop_slug];
  if (fm && p.days_to_maturity == null) {
    // Next ripening season at least ~2 months after planting.
    harvest = new Date(planted.getFullYear(), fm - 1, 20);
    while (harvest.getTime() - planted.getTime() < 60 * DAY) harvest = new Date(harvest.getFullYear() + 1, fm - 1, 20);
  }
  const elapsed = (Date.now() - planted.getTime()) / DAY;
  return { planted, harvest, days: Math.round((harvest.getTime() - planted.getTime()) / DAY), estimatedDate, daysLeft: Math.ceil((harvest.getTime() - Date.now()) / DAY), progress: Math.max(0, Math.min(1, elapsed / Math.max(1, (harvest.getTime() - planted.getTime()) / DAY))) };
}

export const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtY = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** How long a crop keeps producing once ready: "frost" = until first fall frost, number = weeks. Missing = one-time harvest. */
const HARVEST_SPAN: Record<string, "frost" | number> = {
  tomato: "frost", habanero: "frost", jalapeno: "frost", "bell-pepper": "frost", cucumber: "frost", "summer-squash": "frost",
  zucchini: "frost", "pole-beans": "frost", okra: "frost", eggplant: "frost", basil: "frost",
  "bush-beans": 4, peas: 4, kale: 12, collards: 12, chard: 12, lettuce: 4, arugula: 4, spinach: 4, "brussels-sprouts": 8,
  strawberry: 4, blueberry: 6, fig: 8, cantaloupe: 4, watermelon: 4,
  thyme: "frost", oregano: "frost", rosemary: "frost", sage: "frost", mint: "frost", parsley: "frost", chives: "frost", cilantro: 6, dill: 6, lavender: 8,
};

/** End of the harvest window for crops that keep producing; null for one-time harvests. */
export function harvestUntil(slug: string, harvest: Date, zone: string): Date | null {
  const span = HARVEST_SPAN[slug];
  if (span === undefined) return null;
  if (span === "frost") {
    const f = frostDates(zone, harvest.getFullYear()).first;
    return f > harvest ? f : addWeeks(harvest, 4);
  }
  return addWeeks(harvest, span);
}
