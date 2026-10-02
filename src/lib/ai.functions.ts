import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CROPS } from "./crops";

const MODEL = "claude-opus-5-5";

/** One Claude call that must answer with JSON matching `schema`; returns the parsed object. */
async function askClaude(
  system: string,
  content: string | Anthropic.Beta.BetaContentBlockParam[],
  schema: Record<string, unknown>,
): Promise<unknown> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured - set ANTHROPIC_API_KEY.");
  const client = new Anthropic({ apiKey });
  let msg: Anthropic.Beta.BetaMessage;
  try {
    msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      throw new Error("AI is busy right now. Try again in a minute.");
    if (e instanceof Anthropic.AuthenticationError)
      throw new Error("The AI key is invalid - check ANTHROPIC_API_KEY.");
    if (e instanceof Anthropic.APIError)
      throw new Error(
        `AI request failed (${e.status ?? "network"}) ${e.message.slice(0, 200)}`,
      );
    throw e;
  }
  if (msg.stop_reason === "refusal")
    throw new Error("The AI declined to answer that.");
  const text = msg.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("");
  if (!text) throw new Error("The AI returned no answer.");
  return JSON.parse(text);
}

/** Turn a `data:image/...;base64,` URL into a Claude image block. */
function imageBlock(dataUrl: string): Anthropic.Beta.BetaImageBlockParam {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/s);
  if (!m?.[1] || !m[2]) throw new Error("Unsupported image");
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: m[1] as "image/jpeg" | "image/png" | "image/webp",
      data: m[2],
    },
  };
}

const Out = z.object({
  crop_slug: z.string(),
  name: z.string(),
  color: z.string(),
  days_to_maturity: z.number().nullable(),
  description: z.string(),
  tips: z.string(),
});

export const lookupVariety = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ query: z.string().min(2).max(120), zone: z.string().max(4) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const slugs = CROPS.map((c) => c.slug).join(", ");
    const raw = await askClaude(
      "You are a horticulture reference. Give concise, accurate facts for home gardeners. If unsure, say so in the description.",
      `Plant variety: "${data.query}". Gardener is in USDA zone ${data.zone}.
Return: crop_slug = the closest match from this list (or "other"): ${slugs}.
name = proper variety name. color = hex color of the ripe fruit/main edible part as it looks in photos. days_to_maturity = typical days from transplant (or seed if direct-sown), null if unknown.
description = 1-2 sentences on appearance, flavor and growth habit. tips = 2-4 short sentences on planting timing for the zone, care, and seed saving/propagation.`,
      {
        type: "object",
        additionalProperties: false,
        required: [
          "crop_slug",
          "name",
          "color",
          "days_to_maturity",
          "description",
          "tips",
        ],
        properties: {
          crop_slug: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
          days_to_maturity: { type: ["number", "null"] },
          description: { type: "string" },
          tips: { type: "string" },
        },
      },
    );
    const out = Out.parse(raw);
    if (!/^#[0-9a-f]{6}$/i.test(out.color)) out.color = "#2f9e44";
    const { data: row, error } = await context.supabase
      .from("plant_varieties")
      .insert({
        user_id: context.userId,
        crop_slug: out.crop_slug,
        name: out.name,
        color: out.color,
        days_to_maturity: out.days_to_maturity
          ? Math.round(out.days_to_maturity)
          : null,
        description: out.description,
        tips: out.tips,
        source: "ai",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Generate an emoji-style plant picture; returns a base64 PNG (client downsizes before saving). */
export const generatePlantIcon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ subject: z.string().min(2).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    // Claude doesn't draw images, so custom icons use OpenAI's image API (optional).
    const key = process.env["OPENAI_API_KEY"];
    if (!key)
      throw new Error(
        "Custom icons need OPENAI_API_KEY - pick a built-in icon instead.",
      );
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env["OPENAI_IMAGE_MODEL"] ?? "gpt-image-1",
        prompt: `A single ${data.subject} drawn as a glossy Apple-style emoji icon: centered, bold simple shapes, soft highlights, vibrant natural colors, no text, transparent background, no shadow on the ground, nothing else in frame.`,
        size: "1024x1024",
        quality: "low",
        background: "transparent",
        output_format: "png",
      }),
    });
    if (res.status === 429)
      throw new Error("Too many requests, try again in a minute.");
    if (!res.ok) throw new Error(`Image generation failed (${res.status})`);
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image came back - try again.");
    return { b64 };
  });

const UpdateOut = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      planted_on: z.string().nullable(),
      expected_harvest: z.string().nullable(),
      method: z.enum(["transplant", "seed"]).nullable(),
      status: z.enum(["growing", "harvested", "removed"]).nullable(),
      add_note: z.string().nullable(),
      summary: z.string(),
    }),
  ),
  reply: z.string(),
});

/** Turn a plain-language garden update into proposed changes to plantings (the client reviews + applies them). */
export const proposeLogUpdates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message: z.string().min(2).max(2000),
        today: z.string().max(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ data: plantings, error }, { data: beds }] = await Promise.all([
      context.supabase
        .from("plantings")
        .select(
          "id, bed_id, crop_slug, variety, planted_on, method, status, notes, cell_x, cell_y",
        )
        .neq("status", "removed"),
      context.supabase.from("beds").select("id, name"),
    ]);
    if (error) throw new Error(error.message);
    const bedName = new Map((beds ?? []).map((b) => [b.id, b.name]));
    const list = (plantings ?? []).map((p) => ({
      id: p.id,
      crop: CROPS.find((c) => c.slug === p.crop_slug)?.name ?? p.crop_slug,
      variety: p.variety,
      bed: bedName.get(p.bed_id) ?? "",
      square: `${p.cell_x},${p.cell_y}`,
      planted_on: p.planted_on,
      method: p.method,
      status: p.status,
      notes: p.notes,
    }));
    const raw = await askClaude(
      `You update a home gardener's planting log. Today is ${data.today}. Gardener is in USDA zone 7b (first fall frost ~Oct 25). Match the gardener's message to plantings in the list (by crop, variety, or bed; "my potatoes" means every potato planting). Only include plantings the message clearly refers to. Fields you do not change must be null. planted_on is YYYY-MM-DD (resolve "today", "last week", "May 3" etc. relative to today). add_note is a short dated-free observation to append (e.g. "Vines 5-6 in, no fruit yet"). status "harvested" only if they say they harvested; "removed" only if pulled/died. expected_harvest is YYYY-MM-DD: set it whenever the message implies when harvest will happen (e.g. "not ready until first frost" -> your zone frost date; "5-6 in, no fruit yet" on cucumbers -> realistic date a few weeks out). If they just planted, set planted_on and leave expected_harvest null unless stated. summary = a few words describing the change. reply = one friendly sentence to the gardener, mention anything you could not match.`,
      `Plantings:\n${JSON.stringify(list)}\n\nMessage: ${data.message}`,
      {
        type: "object",
        additionalProperties: false,
        required: ["updates", "reply"],
        properties: {
          reply: { type: "string" },
          updates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "planted_on",
                "expected_harvest",
                "method",
                "status",
                "add_note",
                "summary",
              ],
              properties: {
                id: { type: "string" },
                planted_on: { type: ["string", "null"] },
                expected_harvest: { type: ["string", "null"] },
                method: {
                  anyOf: [{ type: "string", enum: ["transplant", "seed"] }, { type: "null" }],
                },
                status: {
                  anyOf: [{ type: "string", enum: ["growing", "harvested", "removed"] }, { type: "null" }],
                },
                add_note: { type: ["string", "null"] },
                summary: { type: "string" },
              },
            },
          },
        },
      },
    );
    const out = UpdateOut.parse(raw);
    const ids = new Set(list.map((p) => p.id));
    out.updates = out.updates.filter(
      (u) =>
        ids.has(u.id) &&
        (!u.planted_on || /^\d{4}-\d{2}-\d{2}$/.test(u.planted_on)) &&
        (!u.expected_harvest || /^\d{4}-\d{2}-\d{2}$/.test(u.expected_harvest)),
    );
    return out;
  });

const SuggestOut = z.object({
  summary: z.string(),
  suggestions: z.array(
    z.object({
      crop_slug: z.string(),
      name: z.string(),
      why: z.string(),
      when: z.string(),
      prep: z.array(z.string()),
    }),
  ),
});

/** Suggest crops for a bed based on its type, size, sun, soil notes and history. */
export const suggestForBed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        bedId: z.string().uuid(),
        today: z.string().max(10),
        wish: z.string().max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [
      { data: bed, error },
      { data: plants },
      { data: notes },
      { data: prof },
    ] = await Promise.all([
      context.supabase
        .from("beds")
        .select("name, kind, w, h, sun, sun_hours, soil_notes")
        .eq("id", data.bedId)
        .single(),
      context.supabase
        .from("plantings")
        .select("crop_slug, status, planted_on, notes")
        .eq("bed_id", data.bedId),
      context.supabase
        .from("bed_notes")
        .select("kind, body, noted_on")
        .eq("bed_id", data.bedId)
        .order("noted_on", { ascending: false })
        .limit(20),
      context.supabase
        .from("profiles")
        .select("zone")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    if (error || !bed) throw new Error("Bed not found");
    const zone = prof?.zone ?? "7b";
    const slugs = CROPS.map((c) => c.slug).join(", ");
    const raw = await askClaude(
      `You are a practical vegetable-garden advisor. Today is ${data.today}, USDA zone ${zone}. Suggest 4-6 crops that fit this growing area right now or in the next planting window, considering type (raised/in-ground/pot), size, sun hours, soil notes, past plantings (rotate families, avoid repeating heavy feeders) and notes about performance. crop_slug must be one of: ${slugs} (or "other"). why = 1 sentence. when = concise timing, e.g. "Plant now - by Oct 15" or "Next spring, after Apr 20". prep = 2-4 short concrete steps to do before planting (soil amendments, compost amount, pH, trellis, spacing). summary = one sentence about the spot.`,
      JSON.stringify({
        bed,
        history: plants ?? [],
        notes: notes ?? [],
        gardener_wish: data.wish || null,
      }),
      {
        type: "object",
        additionalProperties: false,
        required: ["summary", "suggestions"],
        properties: {
          summary: { type: "string" },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["crop_slug", "name", "why", "when", "prep"],
              properties: {
                crop_slug: { type: "string" },
                name: { type: "string" },
                why: { type: "string" },
                when: { type: "string" },
                prep: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    );
    return SuggestOut.parse(raw);
  });

const PlanOut = z.object({
  summary: z.string(),
  weather: z.array(z.string()),
  crops: z.array(
    z.object({
      crop_slug: z.string(),
      name: z.string(),
      bed_name: z.string(),
      why: z.string(),
    }),
  ),
  prep: z.array(z.string()),
  checklist: z.array(z.string()),
});
export type PlantingPlanResult = z.infer<typeof PlanOut>;

/** Planting-day report: what fits the date, which beds, frost risk and prep. */
export const planPlantingDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        today: z.string().max(10),
        wish: z.string().max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { frostDates, inWindowNow } = await import("./zones");
    const [{ data: beds }, { data: plants }, { data: prof }] =
      await Promise.all([
        context.supabase
          .from("beds")
          .select("id, name, kind, w, h, sun, sun_hours, soil_notes"),
        context.supabase
          .from("plantings")
          .select("bed_id, crop_slug, status, cell_w, cell_h"),
        context.supabase
          .from("profiles")
          .select("zone")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);
    const zone = prof?.zone ?? "7b";
    const day = new Date(data.date + "T12:00");
    const fd = frostDates(zone, day.getFullYear());
    const inWindow = CROPS.filter((c) => inWindowNow(c, zone, day)).map(
      (c) => c.slug,
    );
    const bedInfo = (beds ?? []).map((b) => {
      const mine = (plants ?? []).filter((p) => p.bed_id === b.id);
      const used = mine
        .filter((p) => p.status === "growing")
        .reduce((s, p) => s + (p.cell_w ?? 1) * (p.cell_h ?? 1), 0);
      return {
        name: b.name,
        kind: b.kind,
        size: `${b.w}x${b.h} ft`,
        sun: b.sun,
        sun_hours: b.sun_hours,
        soil_notes: b.soil_notes,
        open_sq_ft: Math.max(0, b.w * b.h - used),
        growing: mine
          .filter((p) => p.status === "growing")
          .map((p) => p.crop_slug),
        past: mine
          .filter((p) => p.status !== "growing")
          .map((p) => p.crop_slug),
      };
    });
    const raw = await askClaude(
      `You are a practical garden planner. Today is ${data.today}. The gardener plans to plant on ${data.date} in USDA zone ${zone} (avg last frost ${fd.last.toDateString()}, first frost ${fd.first.toDateString()}). Build a short planting-day report. crops: 3-6 picks that fit that date (prefer in_window list) matched to a bed with open space and suitable sun; crop_slug from: ${CROPS.map((c) => c.slug).join(", ")} or "other"; bed_name must be an existing bed name; why = 1 sentence. weather: 2-3 bullets on frost/heat risk and typical conditions for that date. prep: 3-5 steps for the days before (compost, watering, hardening off, buying). checklist: 4-7 items to bring/do on the day. summary: 1 sentence.`,
      JSON.stringify({
        in_window: inWindow,
        beds: bedInfo,
        gardener_wish: data.wish || null,
      }),
      {
        type: "object",
        additionalProperties: false,
        required: ["summary", "weather", "crops", "prep", "checklist"],
        properties: {
          summary: { type: "string" },
          weather: { type: "array", items: { type: "string" } },
          crops: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["crop_slug", "name", "bed_name", "why"],
              properties: {
                crop_slug: { type: "string" },
                name: { type: "string" },
                bed_name: { type: "string" },
                why: { type: "string" },
              },
            },
          },
          prep: { type: "array", items: { type: "string" } },
          checklist: { type: "array", items: { type: "string" } },
        },
      },
    );
    return PlanOut.parse(raw);
  });

const DiagOut = z.object({
  likely: z.string(),
  pest_key: z.string(),
  confidence: z.string(),
  why: z.string(),
  treatment: z.string(),
  repeat_days: z.number().nullable(),
  prevention: z.array(z.string()),
});
export type Diagnosis = z.infer<typeof DiagOut>;

/** Diagnose a garden problem from a description and/or photo. */
export const diagnoseIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        text: z.string().max(1000),
        crop: z.string().max(80).nullable(),
        image: z
          .string()
          .max(3_000_000)
          .regex(/^data:image\/(jpeg|png|webp);base64,/)
          .nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.text.trim() && !data.image)
      throw new Error("Describe the problem or add a photo");
    const { PESTS } = await import("./crops");
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      {
        type: "text",
        text: JSON.stringify({
          plant: data.crop,
          description: data.text || null,
        }),
      },
    ];
    if (data.image) content.unshift(imageBlock(data.image));
    const raw = await askClaude(
      `You are a home-garden plant doctor. Identify the most likely pest, disease or growing problem. pest_key: one of ${Object.keys(PESTS).join(", ")} or "other". likely: short name. confidence: "low" | "medium" | "high". why: 1-2 sentences on the signs. treatment: concrete organic-first steps with products and amounts. repeat_days: how often to repeat treatment, or null. prevention: 2-3 short tips.`,
      content,
      {
        type: "object",
        additionalProperties: false,
        required: [
          "likely",
          "pest_key",
          "confidence",
          "why",
          "treatment",
          "repeat_days",
          "prevention",
        ],
        properties: {
          likely: { type: "string" },
          pest_key: { type: "string" },
          confidence: { type: "string" },
          why: { type: "string" },
          treatment: { type: "string" },
          repeat_days: { type: ["number", "null"] },
          prevention: { type: "array", items: { type: "string" } },
        },
      },
    );
    return DiagOut.parse(raw);
  });

const PlantOut = z.object({
  reply: z.string(),
  plantings: z.array(
    z.object({
      bed_id: z.string(),
      crop_slug: z.string(),
      variety: z.string().nullable(),
      x: z.number().int().nullable(),
      y: z.number().int().nullable(),
      w: z.number().int(),
      h: z.number().int(),
      planted_on: z.string().nullable(),
      method: z.enum(["transplant", "seed"]),
      stage: z.enum(["seedling", "young", "mature"]).nullable(),
      summary: z.string(),
    }),
  ),
});
export type PlantProposal = z.infer<typeof PlantOut>["plantings"][number] & {
  x: number;
  y: number;
  bed_name: string;
};

/** Turns a spoken/typed description ("4 bell peppers in a row along the top of Greens") into placed plantings. */
export const proposePlantings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message: z.string().min(2).max(2000),
        today: z.string().max(10),
        bedId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ data: beds, error }, { data: plantings }] = await Promise.all([
      context.supabase.from("beds").select("id, name, kind, w, h, sun"),
      context.supabase
        .from("plantings")
        .select("bed_id, crop_slug, cell_x, cell_y, cell_w, cell_h")
        .eq("status", "growing"),
    ]);
    if (error) throw new Error(error.message);
    const occ = (bid: string) =>
      (plantings ?? [])
        .filter((p) => p.bed_id === bid)
        .map((p) => ({
          crop: p.crop_slug,
          x: p.cell_x,
          y: p.cell_y,
          w: p.cell_w,
          h: p.cell_h,
        }));
    const bedList = (beds ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      kind: b.kind,
      width_ft: b.w,
      length_ft: b.h,
      sun: b.sun,
      taken: occ(b.id),
    }));
    const crops = CROPS.map((c) => `${c.slug}=${c.name}`).join(", ");
    const raw = await askClaude(
      `You place new plantings in a home garden from the gardener's spoken description. Today is ${data.today}. Each bed is a grid of 1 ft squares: x is 0..width-1 left to right, y is 0..length-1 top to bottom ("top"/"back"/"north" = y 0, "left" = x 0). w and h are the squares the planting covers; a row of 4 plants along the top of a bed is one planting with w=4,h=1. Group identical crops placed together into ONE planting covering the area. Never overlap "taken" squares or go outside the bed; if the gardener gives no position set x and y to null (the app finds space). ${data.bedId ? `The gardener is looking at bed id ${data.bedId}; use it unless they name another bed.` : "Match bed names loosely."} crop_slug must be one of: ${crops}. If the crop isn't in the list pick the closest slug and put the real name in variety. variety = cultivar if said, else null. planted_on YYYY-MM-DD (default today if they say they planted it; null if they are planning). method "seed" if sown/seeded, else "transplant". stage seedling/young/mature if implied else null. summary = a few words. reply = one friendly sentence, mention anything you couldn't place.`,
      `Beds:\n${JSON.stringify(bedList)}\n\nGardener: ${data.message}`,
      {
        type: "object",
        additionalProperties: false,
        required: ["reply", "plantings"],
        properties: {
          reply: { type: "string" },
          plantings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "bed_id",
                "crop_slug",
                "variety",
                "x",
                "y",
                "w",
                "h",
                "planted_on",
                "method",
                "stage",
                "summary",
              ],
              properties: {
                bed_id: { type: "string" },
                crop_slug: { type: "string" },
                variety: { type: ["string", "null"] },
                x: { type: ["integer", "null"] },
                y: { type: ["integer", "null"] },
                w: { type: "integer" },
                h: { type: "integer" },
                planted_on: { type: ["string", "null"] },
                method: { type: "string", enum: ["transplant", "seed"] },
                stage: {
                  anyOf: [{ type: "string", enum: ["seedling", "young", "mature"] }, { type: "null" }],
                },
                summary: { type: "string" },
              },
            },
          },
        },
      },
    );
    const out = PlantOut.parse(raw);
    // Validate placement server-side and find space when needed.
    const taken = new Map((beds ?? []).map((b) => [b.id, occ(b.id)]));
    const hit = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number },
    ) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const placed: PlantProposal[] = [];
    const skipped: string[] = [];
    for (const p of out.plantings) {
      const bed = beds?.find((b) => b.id === p.bed_id);
      if (!bed || !CROPS.some((c) => c.slug === p.crop_slug)) {
        skipped.push(p.summary);
        continue;
      }
      const w = Math.max(1, Math.min(p.w, bed.w)),
        h = Math.max(1, Math.min(p.h, bed.h));
      const list = taken.get(bed.id)!;
      const free = (x: number, y: number) =>
        x >= 0 &&
        y >= 0 &&
        x + w <= bed.w &&
        y + h <= bed.h &&
        !list.some((o) => hit(o, { x, y, w, h }));
      let at: { x: number; y: number } | null =
        p.x != null && p.y != null && free(p.x, p.y)
          ? { x: p.x, y: p.y }
          : null;
      for (let y = 0; !at && y + h <= bed.h; y++)
        for (let x = 0; !at && x + w <= bed.w; x++)
          if (free(x, y)) at = { x, y };
      if (!at) {
        skipped.push(`${p.summary} (no room in ${bed.name})`);
        continue;
      }
      list.push({ crop: p.crop_slug, ...at, w, h });
      placed.push({
        ...p,
        ...at,
        w,
        h,
        bed_name: bed.name,
        planted_on:
          p.planted_on && /^\d{4}-\d{2}-\d{2}$/.test(p.planted_on)
            ? p.planted_on
            : null,
      });
    }
    return {
      reply:
        out.reply +
        (skipped.length ? ` Couldn't place: ${skipped.join("; ")}.` : ""),
      plantings: placed,
    };
  });
