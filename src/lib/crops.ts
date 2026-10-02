// Built-in plant library. Planting windows are in weeks relative to the
// zone's average last spring frost (spring) or first fall frost (fall).

export type PestKey =
  | "aphids" | "cabbageworm" | "hornworm" | "vineborer" | "fleabeetle"
  | "japanesebeetle" | "mildew" | "slugs" | "spidermites" | "cukebeetle"
  | "squashbug" | "blight" | "birds" | "carrotfly"
  | "yellowing" | "wilting" | "blossomend" | "leafminer" | "rot";

export const PESTS: Record<PestKey, { name: string; treatment: string; repeatDays: number | null; emoji?: string; prevent?: string }> = {
  aphids: { emoji: "🐜", prevent: "Plant dill, alyssum or calendula nearby to attract ladybugs and lacewings.", name: "Aphids", treatment: "Blast off with water, then spray insecticidal soap. Encourage ladybugs.", repeatDays: 5 },
  cabbageworm: { emoji: "🐛", prevent: "Cover brassicas with insect netting right after planting.", name: "Caterpillars / cabbage worms", treatment: "Spray Bt (Bacillus thuringiensis) in the evening; cover with insect netting.", repeatDays: 7 },
  hornworm: { emoji: "🐛", name: "Tomato hornworm", treatment: "Hand-pick at dusk; spray Bt on young larvae. Leave ones with white wasp cocoons.", repeatDays: 7 },
  vineborer: { emoji: "🪲", prevent: "Plant a second squash crop in early July after moths finish laying.", name: "Squash vine borer", treatment: "Wrap stems with foil, slit stem to remove larva and bury the cut. Row cover until flowering.", repeatDays: 7 },
  fleabeetle: { emoji: "🪲", name: "Flea beetles", treatment: "Row cover on seedlings; spray neem oil or spinosad.", repeatDays: 7 },
  japanesebeetle: { emoji: "🪲", name: "Japanese beetles", treatment: "Knock into soapy water each morning; neem oil as a deterrent.", repeatDays: 3 },
  mildew: { emoji: "🌫️", prevent: "Give plants room for airflow; water the soil, not the leaves.", name: "Powdery mildew", treatment: "Spray potassium bicarbonate or 1:9 milk-water; remove worst leaves, improve airflow.", repeatDays: 7 },
  slugs: { emoji: "🐌", prevent: "Water in the morning and clear boards and debris they hide under.", name: "Slugs / snails", treatment: "Iron phosphate bait (Sluggo); beer traps; water in the morning.", repeatDays: 14 },
  spidermites: { emoji: "🕷️", name: "Spider mites", treatment: "Hose undersides of leaves; insecticidal soap or neem oil.", repeatDays: 5 },
  cukebeetle: { emoji: "🪲", prevent: "Use row cover until flowers open, then remove for pollinators.", name: "Cucumber beetles", treatment: "Yellow sticky traps, row cover until bloom, kaolin clay or spinosad.", repeatDays: 7 },
  squashbug: { emoji: "🪳", prevent: "Check leaf undersides for bronze eggs twice a week from early summer.", name: "Squash bugs", treatment: "Crush egg clusters on leaf undersides; board traps; neem on nymphs.", repeatDays: 3 },
  blight: { emoji: "🍂", prevent: "Mulch to stop soil splash, rotate tomato beds every year.", name: "Early blight / leaf spot", treatment: "Remove lower infected leaves, mulch, copper or Serenade (B. subtilis) spray.", repeatDays: 7 },
  birds: { emoji: "🐦", name: "Birds / squirrels", treatment: "Bird netting or hardware-cloth cages over fruit.", repeatDays: null },
  carrotfly: { emoji: "🪰", name: "Carrot rust fly", treatment: "Insect netting over the row; avoid thinning in the evening.", repeatDays: null },
  yellowing: { name: "Yellow leaves", emoji: "🍂", treatment: "Lower leaves only: usually nitrogen - side-dress with compost or fish emulsion. Whole plant: check for overwatering or poor drainage.", repeatDays: 14, prevent: "Feed heavy feeders every 4-6 weeks; water deeply but less often." },
  wilting: { name: "Wilting", emoji: "🥀", treatment: "Check soil 2 in down: dry = water deeply at the base; wet = let it dry out. Wilting in moist soil can mean borers or wilt disease - check stems.", repeatDays: 2, prevent: "Mulch 2-3 in to hold moisture; water in the morning." },
  blossomend: { name: "Blossom end rot", emoji: "🍅", treatment: "Water evenly (1-2 in per week), mulch, and remove affected fruit. Usually a watering issue, not a lack of calcium in the soil.", repeatDays: null, prevent: "Keep moisture steady; avoid heavy nitrogen feeding." },
  leafminer: { name: "Leaf miners", emoji: "🪱", treatment: "Pick off and destroy leaves with tunnels; spinosad on new damage.", repeatDays: 7, prevent: "Row cover on chard, spinach and beets." },
  rot: { name: "Rot / mold", emoji: "🍄", treatment: "Remove affected parts, improve airflow, water at soil level and let the surface dry between waterings.", repeatDays: null, prevent: "Space plants properly and avoid overhead watering." },
};

export type Variety = { name: string; color: string; days?: number; note?: string };

export type Crop = {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  category: "vegetable" | "herb" | "fruit";
  sun: "full" | "part" | "shade";
  sunHours: string;
  water: string;
  spacingIn: number;
  days: number;
  start: "seed" | "transplant" | "either";
  spring?: [number, number];
  fall?: [number, number];
  perennial?: boolean;
  pruning: string;
  feeding: string;
  companions: string[];
  avoid: string[];
  propagation: string;
  seedSaving: string;
  pests: PestKey[];
  varieties: Variety[];
};

type C = Omit<Crop, "varieties"> & { varieties?: Variety[] };
const c = (x: C): Crop => ({ varieties: [], ...x });

export const CROPS: Crop[] = [
  c({ slug: "tomato", name: "Tomato", emoji: "🍅", color: "#e03131", category: "vegetable", sun: "full", sunHours: "8+ hrs", water: "1-2 in/week, deep and even", spacingIn: 24, days: 75, start: "transplant", spring: [1, 6],
    pruning: "Remove suckers on indeterminate types below the first flower cluster; strip leaves touching soil. Top plants ~4 weeks before first frost.",
    feeding: "Compost at planting, then low-nitrogen tomato feed when fruit sets. Add calcium if blossom-end rot.",
    companions: ["basil", "carrot", "parsley", "marigold"], avoid: ["potato", "fennel", "corn"],
    propagation: "Suckers root easily in water in ~1 week - great for cloning a favorite plant.", seedSaving: "Easy for heirlooms: ferment seeds 3 days, rinse, dry. Hybrids won't come true.",
    pests: ["hornworm", "blight", "aphids", "spidermites"],
    varieties: [
      { name: "Roma", color: "#c92a2a", days: 75 }, { name: "Cherry", color: "#fa5252", days: 65 },
      { name: "Brandywine", color: "#d6336c", days: 90 }, { name: "Black Krim", color: "#5c2b29", days: 80, note: "Dusky purple-brown heirloom" },
      { name: "Sun Gold", color: "#f59f00", days: 57 }, { name: "Cherokee Purple", color: "#6b2d3c", days: 80 }, { name: "Better Boy", color: "#e03131", days: 72 },
    ] }),
  c({ slug: "habanero", name: "Habanero", emoji: "🌶️", color: "#fd7e14", category: "vegetable", sun: "full", sunHours: "8+ hrs", water: "1 in/week; let top inch dry", spacingIn: 18, days: 100, start: "transplant", spring: [2, 5],
    pruning: "Pinch first flowers to build plant size; light topping early encourages branching.", feeding: "Balanced feed early, then low-nitrogen once flowering.",
    companions: ["basil", "onion", "carrot"], avoid: ["fennel", "kohlrabi"],
    propagation: "Can overwinter indoors as a perennial; cuttings root slowly.", seedSaving: "Easy - dry seeds from fully ripe pods. Isolate from other peppers.",
    pests: ["aphids", "spidermites"], varieties: [{ name: "Orange Habanero", color: "#fd7e14" }, { name: "Chocolate Habanero", color: "#6f3b1f" }] }),
  c({ slug: "jalapeno", name: "Jalapeño", emoji: "🌶️", color: "#2b8a3e", category: "vegetable", sun: "full", sunHours: "8+ hrs", water: "1 in/week", spacingIn: 18, days: 75, start: "transplant", spring: [2, 5],
    pruning: "Stake heavy plants; pinch early flowers.", feeding: "Balanced feed early, low-nitrogen once flowering.", companions: ["basil", "onion", "tomato"], avoid: ["fennel"],
    propagation: "Overwinter indoors or root cuttings.", seedSaving: "Easy from red-ripe pods.", pests: ["aphids", "spidermites"], varieties: [{ name: "Early Jalapeño", color: "#2f9e44", days: 65 }] }),
  c({ slug: "bell-pepper", name: "Bell Pepper", emoji: "🫑", color: "#37b24d", category: "vegetable", sun: "full", sunHours: "8+ hrs", water: "1-2 in/week, even", spacingIn: 18, days: 75, start: "transplant", spring: [2, 5],
    pruning: "Stake; remove first flower buds for bigger plants.", feeding: "Side-dress with compost at first fruit.", companions: ["basil", "onion", "carrot"], avoid: ["fennel"],
    propagation: "Seed only in practice.", seedSaving: "Easy from fully colored fruit.", pests: ["aphids", "hornworm"], varieties: [{ name: "California Wonder", color: "#2f9e44" }, { name: "Red Bell", color: "#e03131" }] }),
  c({ slug: "carrot", name: "Carrot", emoji: "🥕", color: "#f76707", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1 in/week; keep seedbed moist", spacingIn: 3, days: 70, start: "seed", spring: [-3, 4], fall: [-12, -8],
    pruning: "Thin to 2-3 in apart when 2 in tall.", feeding: "Low nitrogen; loose stone-free soil.", companions: ["onion", "tomato", "chives"], avoid: ["dill"],
    propagation: "Seed only.", seedSaving: "Biennial; crosses with Queen Anne's lace - not recommended.", pests: ["carrotfly"], varieties: [{ name: "Danvers", color: "#f76707" }, { name: "Nantes", color: "#fd7e14", days: 65 }] }),
  c({ slug: "cucumber", name: "Cucumber", emoji: "🥒", color: "#2f9e44", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1-2 in/week, consistent", spacingIn: 12, days: 55, start: "either", spring: [1, 8],
    pruning: "Trellis vines; remove lower side shoots on vining types.", feeding: "Compost at planting; side-dress at first flower.", companions: ["dill", "bush-beans", "radish"], avoid: ["potato", "sage"],
    propagation: "Seed only.", seedSaving: "Let fruit turn yellow on the vine; ferment seeds.", pests: ["cukebeetle", "mildew"], varieties: [{ name: "Marketmore", color: "#2b8a3e" }, { name: "Lemon", color: "#fab005", days: 65 }] }),
  c({ slug: "summer-squash", name: "Summer Squash", emoji: "🟡", color: "#fab005", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1-2 in/week at the base", spacingIn: 24, days: 50, start: "either", spring: [1, 8],
    pruning: "Remove lower leaves that shade crown or show mildew.", feeding: "Rich compost; side-dress when flowering.", companions: ["nasturtium", "corn", "bush-beans"], avoid: ["potato"],
    propagation: "Seed only.", seedSaving: "Hand-pollinate and let fruit fully mature.", pests: ["vineborer", "squashbug", "mildew"], varieties: [{ name: "Yellow Crookneck", color: "#fab005" }] }),
  c({ slug: "zucchini", name: "Zucchini", emoji: "🥒", color: "#2b8a3e", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1-2 in/week at the base", spacingIn: 24, days: 50, start: "either", spring: [1, 8],
    pruning: "Remove lower leaves; harvest at 6-8 in.", feeding: "Rich compost.", companions: ["nasturtium", "bush-beans"], avoid: ["potato"],
    propagation: "Seed only.", seedSaving: "Let a fruit grow huge and hard.", pests: ["vineborer", "squashbug", "mildew"], varieties: [{ name: "Black Beauty", color: "#1b4332" }] }),
  c({ slug: "winter-squash", name: "Winter Squash", emoji: "🎃", color: "#e8590c", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1 in/week", spacingIn: 36, days: 95, start: "seed", spring: [1, 5],
    pruning: "Pinch vine tips once 4-5 fruit set.", feeding: "Compost-rich mound.", companions: ["corn", "pole-beans"], avoid: ["potato"],
    propagation: "Seed only.", seedSaving: "Easy from cured fruit.", pests: ["vineborer", "squashbug", "mildew"], varieties: [{ name: "Butternut", color: "#e8a35c" }, { name: "Delicata", color: "#f2d16b" }] }),
  c({ slug: "pumpkin", name: "Pumpkin", emoji: "🎃", color: "#fd7e14", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1-2 in/week", spacingIn: 48, days: 100, start: "seed", spring: [3, 7],
    pruning: "Pinch vines after fruit set.", feeding: "Heavy feeder - lots of compost.", companions: ["corn", "pole-beans"], avoid: ["potato"],
    propagation: "Seed only.", seedSaving: "Easy from mature fruit.", pests: ["vineborer", "squashbug", "mildew"] }),
  c({ slug: "broccoli", name: "Broccoli", emoji: "🥦", color: "#2f9e44", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1-1.5 in/week", spacingIn: 18, days: 65, start: "transplant", spring: [-4, -1], fall: [-12, -9],
    pruning: "Cut main head with 5 in of stem; side shoots follow.", feeding: "Nitrogen-rich; side-dress 3 weeks after transplant.", companions: ["dill", "onion", "chives"], avoid: ["strawberry", "tomato"],
    propagation: "Seed only.", seedSaving: "Hard - needs many plants; crosses with other brassicas.", pests: ["cabbageworm", "aphids", "fleabeetle"] }),
  c({ slug: "cauliflower", name: "Cauliflower", emoji: "🥦", color: "#e9ecef", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1-1.5 in/week, even", spacingIn: 18, days: 70, start: "transplant", spring: [-4, -1], fall: [-12, -9],
    pruning: "Tie leaves over head when it's egg-sized (blanching).", feeding: "Nitrogen-rich, steady moisture.", companions: ["dill", "onion"], avoid: ["strawberry", "tomato"],
    propagation: "Seed only.", seedSaving: "Hard; crosses with other brassicas.", pests: ["cabbageworm", "aphids"] }),
  c({ slug: "cabbage", name: "Cabbage", emoji: "🥬", color: "#74b816", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1-1.5 in/week", spacingIn: 18, days: 70, start: "transplant", spring: [-4, -1], fall: [-12, -9],
    pruning: "None; harvest when firm.", feeding: "Nitrogen-rich.", companions: ["dill", "onion", "thyme"], avoid: ["strawberry"],
    propagation: "Seed only.", seedSaving: "Biennial, difficult.", pests: ["cabbageworm", "aphids"] }),
  c({ slug: "brussels-sprouts", name: "Brussels Sprouts", emoji: "🥬", color: "#2b8a3e", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1-1.5 in/week", spacingIn: 24, days: 100, start: "transplant", fall: [-16, -13],
    pruning: "Top the plant 4 weeks before harvest; strip lower leaves.", feeding: "Nitrogen-rich.", companions: ["dill", "onion"], avoid: ["strawberry"],
    propagation: "Seed only.", seedSaving: "Biennial, difficult.", pests: ["cabbageworm", "aphids"] }),
  c({ slug: "kale", name: "Kale", emoji: "🥬", color: "#1b4332", category: "vegetable", sun: "full", sunHours: "4-6 hrs", water: "1-1.5 in/week", spacingIn: 18, days: 55, start: "either", spring: [-5, -1], fall: [-10, -6],
    pruning: "Harvest lower leaves first; keep the top growing. Sweeter after frost.", feeding: "Side-dress with compost or fish emulsion monthly.", companions: ["onion", "dill", "beets"], avoid: ["strawberry"],
    propagation: "Stem cuttings root; often overwinters in 7B.", seedSaving: "Biennial - bolts spring 2; crosses with brassicas.", pests: ["cabbageworm", "aphids", "fleabeetle"],
    varieties: [{ name: "Lacinato", color: "#1b3a2e" }, { name: "Red Russian", color: "#6a3d6b" }, { name: "Winterbor", color: "#2b8a3e" }] }),
  c({ slug: "collards", name: "Collards", emoji: "🥬", color: "#2f9e44", category: "vegetable", sun: "full", sunHours: "4-6 hrs", water: "1-1.5 in/week", spacingIn: 18, days: 60, start: "either", spring: [-4, -1], fall: [-12, -8],
    pruning: "Harvest lower leaves.", feeding: "Nitrogen-rich.", companions: ["onion", "dill"], avoid: ["strawberry"], propagation: "Seed only.", seedSaving: "Biennial.", pests: ["cabbageworm", "aphids"] }),
  c({ slug: "arugula", name: "Arugula", emoji: "🌿", color: "#40c057", category: "vegetable", sun: "part", sunHours: "4-6 hrs", water: "1 in/week", spacingIn: 4, days: 40, start: "seed", spring: [-6, 2], fall: [-8, -2],
    pruning: "Cut-and-come-again; pinch flowers to delay bolting.", feeding: "Light feeder.", companions: ["lettuce", "bush-beans"], avoid: [],
    propagation: "Self-sows readily.", seedSaving: "Very easy - let a few bolt.", pests: ["fleabeetle"] }),
  c({ slug: "lettuce", name: "Lettuce", emoji: "🥬", color: "#8ce99a", category: "vegetable", sun: "part", sunHours: "4-6 hrs", water: "1 in/week, shallow roots", spacingIn: 8, days: 45, start: "either", spring: [-6, 2], fall: [-8, -3],
    pruning: "Harvest outer leaves.", feeding: "Light nitrogen.", companions: ["carrot", "radish", "chives"], avoid: [], propagation: "Regrow from stump base.", seedSaving: "Easy, self-pollinating.", pests: ["slugs", "aphids"] }),
  c({ slug: "spinach", name: "Spinach", emoji: "🥬", color: "#2b8a3e", category: "vegetable", sun: "part", sunHours: "4-6 hrs", water: "1 in/week", spacingIn: 4, days: 40, start: "seed", spring: [-6, -2], fall: [-8, -4],
    pruning: "Harvest outer leaves.", feeding: "Nitrogen-rich.", companions: ["strawberry", "peas"], avoid: [], propagation: "Seed only.", seedSaving: "Moderate; wind-pollinated.", pests: ["slugs", "aphids"] }),
  c({ slug: "chard", name: "Swiss Chard", emoji: "🥬", color: "#e64980", category: "vegetable", sun: "part", sunHours: "4-6 hrs", water: "1 in/week", spacingIn: 12, days: 55, start: "either", spring: [-3, 2], fall: [-10, -6],
    pruning: "Harvest outer stalks.", feeding: "Compost.", companions: ["onion", "bush-beans"], avoid: [], propagation: "Seed only.", seedSaving: "Biennial; crosses with beets.", pests: ["slugs"] }),
  c({ slug: "bush-beans", name: "Bush Beans", emoji: "🫘", color: "#5c940d", category: "vegetable", sun: "full", sunHours: "6-8 hrs", water: "1 in/week", spacingIn: 4, days: 55, start: "seed", spring: [1, 10],
    pruning: "None; pick often.", feeding: "Fixes nitrogen - skip fertilizer.", companions: ["carrot", "cucumber", "summer-squash"], avoid: ["onion", "garlic"],
    propagation: "Seed only.", seedSaving: "Very easy - let pods dry on plant.", pests: ["japanesebeetle", "aphids"] }),
  c({ slug: "pole-beans", name: "Pole Beans", emoji: "🫘", color: "#2b8a3e", category: "vegetable", sun: "full", sunHours: "6-8 hrs", water: "1 in/week", spacingIn: 6, days: 65, start: "seed", spring: [1, 8],
    pruning: "Train onto 6 ft trellis.", feeding: "Fixes nitrogen.", companions: ["corn", "winter-squash"], avoid: ["onion"], propagation: "Seed only.", seedSaving: "Very easy.", pests: ["japanesebeetle"] }),
  c({ slug: "peas", name: "Peas", emoji: "🫛", color: "#69db7c", category: "vegetable", sun: "full", sunHours: "6 hrs", water: "1 in/week", spacingIn: 2, days: 60, start: "seed", spring: [-6, -3], fall: [-10, -8],
    pruning: "Trellis; pick pods daily.", feeding: "Fixes nitrogen.", companions: ["carrot", "radish", "spinach"], avoid: ["onion", "garlic"], propagation: "Seed only.", seedSaving: "Very easy.", pests: ["aphids", "mildew"] }),
  c({ slug: "garlic", name: "Garlic", emoji: "🧄", color: "#f1f3f5", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1 in/week; stop 2 weeks before harvest", spacingIn: 6, days: 240, start: "seed", fall: [-4, 0],
    pruning: "Cut scapes on hardneck types in June.", feeding: "Nitrogen in early spring.", companions: ["tomato", "carrot"], avoid: ["peas", "bush-beans"],
    propagation: "Replant your biggest cloves each fall.", seedSaving: "Save bulbs, not seed.", pests: [] }),
  c({ slug: "onion", name: "Onion", emoji: "🧅", color: "#e8a35c", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1 in/week", spacingIn: 4, days: 100, start: "transplant", spring: [-4, -1],
    pruning: "None.", feeding: "Nitrogen early.", companions: ["carrot", "tomato", "kale"], avoid: ["peas", "bush-beans"], propagation: "Sets or seed.", seedSaving: "Biennial.", pests: [] }),
  c({ slug: "leeks", name: "Leeks", emoji: "🧅", color: "#a9e34b", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1 in/week", spacingIn: 6, days: 120, start: "transplant", spring: [-4, 0],
    pruning: "Hill soil around stems to blanch.", feeding: "Nitrogen-rich.", companions: ["carrot"], avoid: ["peas"], propagation: "Seed only.", seedSaving: "Biennial.", pests: [] }),
  c({ slug: "beets", name: "Beets", emoji: "🔴", color: "#a61e4d", category: "vegetable", sun: "full", sunHours: "6 hrs", water: "1 in/week", spacingIn: 4, days: 55, start: "seed", spring: [-4, 2], fall: [-10, -6],
    pruning: "Thin seedlings (eat the greens).", feeding: "Low nitrogen, add boron if cracking.", companions: ["onion", "kale"], avoid: ["pole-beans"], propagation: "Seed only.", seedSaving: "Biennial; crosses with chard.", pests: ["fleabeetle"] }),
  c({ slug: "radish", name: "Radish", emoji: "🔴", color: "#f03e3e", category: "vegetable", sun: "full", sunHours: "6 hrs", water: "Keep evenly moist", spacingIn: 2, days: 28, start: "seed", spring: [-6, 0], fall: [-8, -2],
    pruning: "Thin to 2 in.", feeding: "None.", companions: ["lettuce", "cucumber", "peas"], avoid: [], propagation: "Seed only.", seedSaving: "Easy; seed pods are edible.", pests: ["fleabeetle"] }),
  c({ slug: "potato", name: "Potato", emoji: "🥔", color: "#c08552", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1-2 in/week once flowering", spacingIn: 12, days: 90, start: "seed", spring: [-3, 0],
    pruning: "Hill soil over stems as they grow.", feeding: "Compost; avoid fresh manure (scab).", companions: ["bush-beans", "cabbage"], avoid: ["tomato", "cucumber", "summer-squash"],
    propagation: "Plant chitted seed potatoes - save small tubers for next year.", seedSaving: "Save tubers in a cool dark place.", pests: ["blight", "fleabeetle"] }),
  c({ slug: "sweet-potato", name: "Sweet Potato", emoji: "🍠", color: "#d9480f", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1 in/week", spacingIn: 12, days: 100, start: "transplant", spring: [3, 6],
    pruning: "Don't let vines root at nodes.", feeding: "Low nitrogen.", companions: ["bush-beans"], avoid: ["winter-squash"], propagation: "Grow slips from a sprouted tuber in water.", seedSaving: "Save tubers above 55°F.", pests: [] }),
  c({ slug: "sunchoke", name: "Sunchoke", emoji: "🌻", color: "#fcc419", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "Drought tolerant", spacingIn: 18, days: 120, start: "seed", spring: [-4, 2], perennial: true,
    pruning: "Cut stalks after frost; harvest tubers after frost for sweetness.", feeding: "None - very vigorous.", companions: ["cucumber"], avoid: ["tomato"],
    propagation: "Spreads aggressively by tubers - contain it.", seedSaving: "Save tubers.", pests: [] }),
  c({ slug: "eggplant", name: "Eggplant", emoji: "🍆", color: "#5f3dc4", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1-2 in/week", spacingIn: 24, days: 70, start: "transplant", spring: [2, 5],
    pruning: "Stake; pinch to 3-4 main stems.", feeding: "Balanced, then low-nitrogen.", companions: ["bush-beans", "bell-pepper"], avoid: ["fennel"], propagation: "Seed only.", seedSaving: "Easy from overripe fruit.", pests: ["fleabeetle"] }),
  c({ slug: "okra", name: "Okra", emoji: "🌱", color: "#5c940d", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1 in/week", spacingIn: 12, days: 60, start: "seed", spring: [3, 8],
    pruning: "Cut pods at 3-4 in every 2 days.", feeding: "Light.", companions: ["bell-pepper", "cucumber"], avoid: [], propagation: "Seed only.", seedSaving: "Easy - let pods dry.", pests: ["aphids"] }),
  c({ slug: "corn", name: "Sweet Corn", emoji: "🌽", color: "#fcc419", category: "vegetable", sun: "full", sunHours: "8 hrs", water: "1-2 in/week, critical at tasseling", spacingIn: 12, days: 75, start: "seed", spring: [1, 6],
    pruning: "Plant in blocks for pollination.", feeding: "Heavy nitrogen feeder.", companions: ["pole-beans", "winter-squash"], avoid: ["tomato"], propagation: "Seed only.", seedSaving: "Needs large isolated stands.", pests: ["japanesebeetle", "birds"] }),
  c({ slug: "watermelon", name: "Watermelon", emoji: "🍉", color: "#2f9e44", category: "fruit", sun: "full", sunHours: "8+ hrs", water: "1-2 in/week; reduce at ripening", spacingIn: 36, days: 85, start: "either", spring: [2, 6],
    pruning: "Limit to 2-3 fruit per vine; set fruit on a board.", feeding: "Compost; low-nitrogen once vining.", companions: ["radish", "nasturtium"], avoid: ["potato"],
    propagation: "Seed only.", seedSaving: "Easy from ripe fruit.", pests: ["cukebeetle", "mildew"], varieties: [{ name: "Sugar Baby", color: "#1b4332", days: 75 }, { name: "Crimson Sweet", color: "#5c940d" }] }),
  c({ slug: "cantaloupe", name: "Cantaloupe", emoji: "🍈", color: "#e8a35c", category: "fruit", sun: "full", sunHours: "8+ hrs", water: "1-2 in/week", spacingIn: 36, days: 80, start: "either", spring: [2, 6],
    pruning: "Pinch vine tips after fruit set.", feeding: "Compost.", companions: ["radish"], avoid: ["potato"], propagation: "Seed only.", seedSaving: "Easy.", pests: ["cukebeetle", "mildew"] }),
  c({ slug: "strawberry", name: "Strawberry", emoji: "🍓", color: "#e03131", category: "fruit", sun: "full", sunHours: "6-8 hrs", water: "1 in/week", spacingIn: 12, days: 90, start: "transplant", spring: [-4, 0], perennial: true,
    pruning: "Pinch first-year flowers on June-bearers; trim runners.", feeding: "Balanced feed after harvest.", companions: ["spinach", "lettuce", "thyme"], avoid: ["cabbage", "broccoli"],
    propagation: "Very easy - pin runners into pots.", seedSaving: "Propagate by runners instead.", pests: ["slugs", "birds"] }),
  c({ slug: "blueberry", name: "Blueberry", emoji: "🫐", color: "#364fc7", category: "fruit", sun: "full", sunHours: "6-8 hrs", water: "1-2 in/week", spacingIn: 60, days: 365, start: "transplant", spring: [-4, 0], fall: [-8, -2], perennial: true,
    pruning: "Late winter: remove oldest canes and low growth.", feeding: "Acid soil (pH 4.5-5.5); acid fertilizer, sulfur.", companions: ["thyme"], avoid: ["tomato"],
    propagation: "Softwood cuttings in early summer.", seedSaving: "Not true to type - use cuttings.", pests: ["birds"] }),
  c({ slug: "fig", name: "Fig", emoji: "🟣", color: "#6741d9", category: "fruit", sun: "full", sunHours: "8 hrs", water: "1 in/week; mulch", spacingIn: 120, days: 365, start: "transplant", spring: [0, 4], perennial: true,
    pruning: "Late winter: remove dead wood, keep an open shape. In 7B wrap or mulch roots for winter.", feeding: "Light - too much nitrogen means no fruit.", companions: ["thyme"], avoid: [],
    propagation: "Very easy from hardwood cuttings in late winter.", seedSaving: "Propagate by cuttings.", pests: ["birds"], varieties: [{ name: "Chicago Hardy", color: "#5f3dc4" }, { name: "Brown Turkey", color: "#7a4b2a" }] }),
  c({ slug: "basil", name: "Basil", emoji: "🌿", color: "#37b24d", category: "herb", sun: "full", sunHours: "6-8 hrs", water: "1 in/week", spacingIn: 12, days: 60, start: "either", spring: [2, 8],
    pruning: "Pinch above a leaf pair every week; remove flowers.", feeding: "Light.", companions: ["tomato", "bell-pepper"], avoid: ["sage"],
    propagation: "Cuttings root in water in ~1 week.", seedSaving: "Easy; varieties cross.", pests: ["japanesebeetle", "slugs"], varieties: [{ name: "Genovese", color: "#2f9e44" }, { name: "Thai", color: "#5f3d6b" }] }),
  c({ slug: "thyme", name: "Thyme", emoji: "🌿", color: "#5c940d", category: "herb", sun: "full", sunHours: "6+ hrs", water: "Let dry out", spacingIn: 12, days: 85, start: "transplant", spring: [-2, 4], perennial: true,
    pruning: "Trim by a third after flowering; don't cut into old wood.", feeding: "None.", companions: ["cabbage", "strawberry"], avoid: [], propagation: "Layering or cuttings.", seedSaving: "Easy.", pests: [] }),
  c({ slug: "oregano", name: "Oregano", emoji: "🌿", color: "#5c940d", category: "herb", sun: "full", sunHours: "6+ hrs", water: "Let dry out", spacingIn: 12, days: 80, start: "transplant", spring: [-2, 4], perennial: true,
    pruning: "Cut back before flowering for best flavor.", feeding: "None.", companions: ["bell-pepper", "tomato"], avoid: [], propagation: "Division or cuttings.", seedSaving: "Easy.", pests: [] }),
  c({ slug: "rosemary", name: "Rosemary", emoji: "🌲", color: "#2b8a3e", category: "herb", sun: "full", sunHours: "6-8 hrs", water: "Let dry out", spacingIn: 24, days: 90, start: "transplant", spring: [0, 4], perennial: true,
    pruning: "Light trims; avoid cutting into bare wood. Borderline hardy in 7B - protect.", feeding: "None.", companions: ["bush-beans", "cabbage"], avoid: [], propagation: "Softwood cuttings.", seedSaving: "Slow; use cuttings.", pests: ["spidermites"] }),
  c({ slug: "sage", name: "Sage", emoji: "🌿", color: "#87a878", category: "herb", sun: "full", sunHours: "6+ hrs", water: "Let dry out", spacingIn: 18, days: 75, start: "transplant", spring: [-2, 4], perennial: true,
    pruning: "Cut back in spring.", feeding: "None.", companions: ["cabbage", "carrot"], avoid: ["cucumber"], propagation: "Cuttings or layering.", seedSaving: "Easy.", pests: [] }),
  c({ slug: "mint", name: "Mint", emoji: "🌱", color: "#38d9a9", category: "herb", sun: "part", sunHours: "4-6 hrs", water: "Keep moist", spacingIn: 18, days: 60, start: "transplant", spring: [-2, 4], perennial: true,
    pruning: "Cut often; grow in a pot - it spreads.", feeding: "None.", companions: ["cabbage"], avoid: [], propagation: "Runners root anywhere.", seedSaving: "Use cuttings.", pests: ["spidermites"] }),
  c({ slug: "cilantro", name: "Cilantro", emoji: "🌿", color: "#69db7c", category: "herb", sun: "part", sunHours: "4-6 hrs", water: "1 in/week", spacingIn: 6, days: 50, start: "seed", spring: [-4, 0], fall: [-8, -4],
    pruning: "Harvest outer stems; bolts in heat - sow every 3 weeks.", feeding: "Light.", companions: ["tomato", "spinach"], avoid: ["fennel"], propagation: "Self-sows.", seedSaving: "Easy - seeds are coriander.", pests: ["aphids"] }),
  c({ slug: "parsley", name: "Parsley", emoji: "🌿", color: "#2f9e44", category: "herb", sun: "part", sunHours: "4-6 hrs", water: "1 in/week", spacingIn: 8, days: 75, start: "either", spring: [-4, 2], fall: [-10, -6],
    pruning: "Cut outer stems at the base.", feeding: "Light.", companions: ["tomato", "carrot"], avoid: [], propagation: "Seed only.", seedSaving: "Biennial - seeds year 2.", pests: ["cabbageworm"] }),
  c({ slug: "chives", name: "Chives", emoji: "🌱", color: "#5c940d", category: "herb", sun: "full", sunHours: "6 hrs", water: "1 in/week", spacingIn: 8, days: 60, start: "either", spring: [-4, 2], perennial: true,
    pruning: "Cut to 2 in; deadhead to prevent self-seeding.", feeding: "Light.", companions: ["carrot", "tomato"], avoid: ["peas"], propagation: "Divide clumps every 3 years.", seedSaving: "Easy.", pests: [] }),
  c({ slug: "dill", name: "Dill", emoji: "🌾", color: "#94d82d", category: "herb", sun: "full", sunHours: "6-8 hrs", water: "1 in/week", spacingIn: 12, days: 50, start: "seed", spring: [-1, 6], fall: [-10, -6],
    pruning: "Harvest fronds; host plant for swallowtail caterpillars.", feeding: "None.", companions: ["cucumber", "cabbage"], avoid: ["carrot", "tomato"], propagation: "Self-sows.", seedSaving: "Very easy.", pests: ["aphids"] }),
  c({ slug: "lavender", name: "Lavender", emoji: "💜", color: "#9775fa", category: "herb", sun: "full", sunHours: "8 hrs", water: "Drought tolerant", spacingIn: 24, days: 100, start: "transplant", spring: [0, 4], perennial: true,
    pruning: "Shear by a third after bloom; never into old wood.", feeding: "None; needs sharp drainage.", companions: ["rosemary", "thyme"], avoid: ["mint"], propagation: "Softwood cuttings.", seedSaving: "Slow; use cuttings.", pests: [] }),
];

export const CROP_MAP = Object.fromEntries(CROPS.map((x) => [x.slug, x])) as Record<string, Crop>;

export const getCrop = (slug: string): Crop =>
  CROP_MAP[slug] ?? c({ slug, name: slug, emoji: "🌱", color: "#2f9e44", category: "vegetable", sun: "full", sunHours: "6+ hrs", water: "1 in/week", spacingIn: 12, days: 60, start: "either",
    pruning: "", feeding: "", companions: [], avoid: [], propagation: "", seedSaving: "", pests: [] });

/** Display name without doubling up, e.g. "Elliott Blueberry" not "Elliott Blueberry Blueberry". */
export function plantName(p: { crop_slug: string; variety?: string | null }) {
  const crop = getCrop(p.crop_slug).name;
  const v = p.variety?.trim();
  if (!v) return crop;
  const root = crop.toLowerCase().replace(/s$/, "");
  return v.toLowerCase().includes(root) ? v : `${v} ${crop}`;
}

const AFTERCARE: Record<string, string> = {
  blueberry: "Water deeply 2-3x a week for the first month, then 1-2 in/week. Mulch 3-4 in of pine bark or needles. Pinch off flowers the first spring so roots establish. Test pH; add sulfur if above 5.5. Net in June before berries color.",
  fig: "Water deeply twice a week the first month. Mulch wide around the base. In 7B, mulch roots heavily or wrap the first winters.",
  strawberry: "Keep crowns at soil level, water daily for a week then 1 in/week. Pinch flowers the first month (June-bearers: first year) for stronger plants. Mulch with straw.",
};
/** What to do right after planting. */
export function aftercare(slug: string) {
  const c = getCrop(slug);
  return AFTERCARE[slug] ?? (c.perennial
    ? "Water deeply every 2-3 days for the first few weeks, then weekly. Mulch 2-3 in, keeping it off the stem. Skip heavy feeding until it shows new growth."
    : c.start === "seed"
      ? "Keep the soil surface evenly moist until seedlings are up, then thin to spacing and water 1 in/week."
      : "Water in well and daily for the first 3-5 days, then deeply 1 in/week. Mulch once soil is warm. Shade cloth for a couple of days if it's hot.");
}
