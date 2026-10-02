import { frostDates } from "./zones";

/** Best propagation timing, in weeks relative to the zone's last (spring) or first (fall) frost. */
type Timing = { how: string; ref: "last" | "first"; weeks: [number, number]; indoor: boolean };
export const PROP_TIMING: Record<string, Timing> = {
  basil: { how: "Root 4 in tip cuttings in water on a sunny windowsill to keep basil going all winter.", ref: "first", weeks: [-6, -1], indoor: true },
  tomato: { how: "Root suckers in water, then pot up under lights for an early start or to save a favorite plant.", ref: "first", weeks: [-6, -2], indoor: true },
  habanero: { how: "Pot up the whole plant or take cuttings and overwinter in a bright window.", ref: "first", weeks: [-4, -1], indoor: true },
  jalapeno: { how: "Pot up and overwinter indoors; cut back by half.", ref: "first", weeks: [-4, -1], indoor: true },
  "bell-pepper": { how: "Pot up and overwinter indoors for an earlier crop next year.", ref: "first", weeks: [-4, -1], indoor: true },
  rosemary: { how: "Take 4-6 in softwood cuttings, dip in rooting hormone, root in damp perlite.", ref: "first", weeks: [-10, -4], indoor: true },
  thyme: { how: "Layer a stem into soil or take tip cuttings.", ref: "last", weeks: [2, 8], indoor: false },
  oregano: { how: "Divide clumps or root cuttings.", ref: "last", weeks: [0, 6], indoor: false },
  mint: { how: "Root cuttings in water any time; divide runners.", ref: "last", weeks: [0, 10], indoor: true },
  sage: { how: "Take softwood cuttings or layer a stem.", ref: "last", weeks: [4, 10], indoor: false },
  lavender: { how: "Take softwood cuttings in late spring or semi-hardwood in late summer.", ref: "last", weeks: [4, 8], indoor: true },
  chives: { how: "Divide clumps every 2-3 years.", ref: "last", weeks: [-4, 2], indoor: false },
  fig: { how: "Take hardwood cuttings while dormant and root indoors.", ref: "first", weeks: [3, 10], indoor: true },
  blueberry: { how: "Softwood cuttings under a humidity dome.", ref: "last", weeks: [6, 10], indoor: true },
  strawberry: { how: "Pin runners into small pots and cut once rooted.", ref: "last", weeks: [10, 16], indoor: false },
  potato: { how: "Chit seed potatoes in a bright, cool room before planting.", ref: "last", weeks: [-6, -2], indoor: true },
  "sweet-potato": { how: "Grow slips from a sweet potato in water.", ref: "last", weeks: [-10, -4], indoor: true },
  sunchoke: { how: "Replant small tubers after digging.", ref: "first", weeks: [0, 4], indoor: false },
  garlic: { how: "Replant your biggest cloves.", ref: "first", weeks: [-2, 3], indoor: false },
};

/** Years seeds typically stay viable when stored well. */
export const SEED_YEARS: Record<string, number> = {
  tomato: 5, habanero: 3, jalapeno: 3, "bell-pepper": 3, cucumber: 5, "summer-squash": 4, zucchini: 4, "winter-squash": 4, pumpkin: 4,
  watermelon: 4, cantaloupe: 5, lettuce: 3, kale: 4, broccoli: 3, cauliflower: 4, cabbage: 4, arugula: 3, spinach: 2, chard: 4, beets: 4,
  carrot: 3, radish: 4, onion: 1, "bush-beans": 3, "pole-beans": 3, peas: 3, corn: 2, okra: 2, eggplant: 4, basil: 5, cilantro: 5,
  parsley: 2, dill: 3, chives: 1, thyme: 3, oregano: 4, sage: 3,
};

export const STORAGE_TIPS = [
  "Dry seeds fully (1-2 weeks on a plate) before packing - they should snap, not bend.",
  "Store in paper envelopes inside an airtight jar with a silica pack or a spoon of dry rice.",
  "Keep cool, dark and dry - a closet or the fridge door. Avoid the freezer unless bone dry.",
  "Label with crop, variety, date and where it grew.",
  "Unsure if old seeds are good? Roll 10 in a damp paper towel; count sprouts after a week.",
];

export function propWindow(slug: string, zone: string, today = new Date()) {
  const t = PROP_TIMING[slug];
  if (!t) return null;
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const base = frostDates(zone, year)[t.ref];
    const start = new Date(base.getTime() + t.weeks[0] * 7 * 86400000);
    const end = new Date(base.getTime() + t.weeks[1] * 7 * 86400000);
    if (end >= today) return { ...t, start, end, now: today >= start };
  }
  return null;
}
