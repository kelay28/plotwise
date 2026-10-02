import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Bed = T["beds"]["Row"];
export type Planting = T["plantings"]["Row"];
export type PestLog = T["pest_logs"]["Row"];
export type BedNote = T["bed_notes"]["Row"];
export type Profile = T["profiles"]["Row"];
export type UserVariety = T["plant_varieties"]["Row"];
export type YardFeature = T["yard_features"]["Row"];
export type BedSection = T["bed_sections"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

const must = <D,>(r: { data: D | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as D;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const id = await uid();
      const existing = must(await supabase.from("profiles").select("*").eq("id", id).maybeSingle());
      if (existing) return existing as Profile;
      return must(await supabase.from("profiles").insert({ id }).select().single()) as Profile;
    },
  });
}
export const useZone = () => useProfile().data?.zone ?? "7b";

export const useBeds = () =>
  useQuery({ queryKey: ["beds"], queryFn: async () => must(await supabase.from("beds").select("*").order("created_at")) as Bed[] });
export const usePlantings = () =>
  useQuery({ queryKey: ["plantings"], queryFn: async () => must(await supabase.from("plantings").select("*").order("created_at")) as Planting[] });
export const usePests = () =>
  useQuery({ queryKey: ["pests"], queryFn: async () => must(await supabase.from("pest_logs").select("*").order("observed_on", { ascending: false })) as PestLog[] });
export const useBedNotes = (bedId: string) =>
  useQuery({ queryKey: ["bed_notes", bedId], queryFn: async () => must(await supabase.from("bed_notes").select("*").eq("bed_id", bedId).order("noted_on", { ascending: false })) as BedNote[] });
export const useFeatures = () =>
  useQuery({ queryKey: ["features"], queryFn: async () => must(await supabase.from("yard_features").select("*").order("created_at")) as YardFeature[] });
export const useSections = () =>
  useQuery({ queryKey: ["sections"], queryFn: async () => must(await supabase.from("bed_sections").select("*").order("created_at")) as BedSection[] });
export const useUserVarieties = () =>
  useQuery({ queryKey: ["varieties"], queryFn: async () => must(await supabase.from("plant_varieties").select("*").order("name")) as UserVariety[] });

type TableName = "beds" | "plantings" | "pest_logs" | "bed_notes" | "profiles" | "plant_varieties" | "yard_features" | "bed_sections";
const keyFor: Record<TableName, string> = { beds: "beds", plantings: "plantings", pest_logs: "pests", bed_notes: "bed_notes", profiles: "profile", plant_varieties: "varieties", yard_features: "features", bed_sections: "sections" };

export function useUpsert<N extends TableName>(table: N) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: T[N]["Insert"] & { id?: string }) => {
      if (row.id) {
        const { id, ...rest } = row;
        return must(await (supabase.from(table) as any).update(rest).eq("id", id).select().single());
      }
      return must(await supabase.from(table).insert(row as never).select().single());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [keyFor[table]] }),
  });
}

export function useRemove(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from(table).delete().eq("id", id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [keyFor[table]] });
      if (table === "beds") { qc.invalidateQueries({ queryKey: ["plantings"] }); qc.invalidateQueries({ queryKey: ["sections"] }); }
    },
  });
}

/** Loads the gardener's sketched layout as editable sample data. */
export async function loadSampleGarden() {
  type S = { name: string; kind: string; x: number; y: number; w: number; h: number; cx: number; cy: number; sun?: string; plants: [number, number, string, string | null, string | null][] };
  const sample: S[] = [
    { name: "Potato patch", kind: "in-ground", x: 0, y: 0, w: 4, h: 3, cx: 0, cy: 0, plants: [[0, 0, "potato", null, null], [2, 0, "potato", null, null], [1, 1, "potato", null, null]] },
    { name: "Pepper & carrot bed", kind: "raised", x: 6, y: 3, w: 8, h: 4, cx: 5, cy: 0, plants: [
      [0, 0, "habanero", null, null], [1, 2, "tomato", null, null], [3, 0, "bell-pepper", null, null], [3, 1, "bell-pepper", null, null], [3, 2, "bell-pepper", null, null],
      [5, 0, "carrot", null, "2026-09-12"], [6, 0, "carrot", null, "2026-09-12"], [5, 2, "tomato", "Cherry", null], [6, 3, "cucumber", null, null], [7, 3, "cucumber", null, null]] },
    { name: "Brassica bed", kind: "raised", x: 16, y: 0, w: 4, h: 4, cx: 14, cy: 0, plants: [
      [0, 0, "summer-squash", null, null], [1, 0, "broccoli", null, null], [2, 0, "cauliflower", null, null], [3, 0, "cauliflower", null, null],
      [0, 2, "summer-squash", null, null], [1, 2, "summer-squash", null, null], [2, 2, "kale", null, null], [3, 2, "kale", null, null]] },
    { name: "Sunchoke row", kind: "in-ground", x: 23, y: 0, w: 2, h: 8, cx: 19, cy: 0, plants: [[0, 1, "sunchoke", null, null], [0, 3, "sunchoke", null, null], [0, 5, "sunchoke", null, null]] },
    { name: "Tomato row", kind: "in-ground", x: 27, y: 0, w: 3, h: 10, cx: 22, cy: 0, plants: [
      [0, 0, "basil", null, null], [1, 2, "tomato", "Roma", null], [1, 5, "tomato", "Brandywine", null], [2, 5, "tomato", "Cherry", null], [2, 2, "tomato", "Black Krim", null]] },
    { name: "Herb bed", kind: "raised", x: 6, y: 22, w: 6, h: 6, cx: 0, cy: 11, plants: [
      [0, 0, "thyme", null, null], [0, 2, "oregano", null, null], [0, 4, "rosemary", null, null], [0, 5, "basil", null, null], [2, 0, "jalapeno", null, null],
      [2, 4, "cilantro", null, null], [5, 0, "parsley", null, null], [4, 3, "chives", null, null], [4, 5, "dill", null, null]] },
    { name: "Greens bed", kind: "raised", x: 18, y: 22, w: 4, h: 4, cx: 7, cy: 11, plants: [
      [2, 0, "arugula", null, "2026-08-08"], [3, 1, "arugula", null, "2026-08-08"], [0, 3, "jalapeno", null, null], [2, 2, "kale", null, "2026-07-24"], [3, 3, "kale", null, "2026-07-24"]] },
    { name: "Melon & carrot bed", kind: "raised", x: 28, y: 15, w: 3, h: 6, cx: 12, cy: 11, plants: [
      [0, 0, "tomato", null, null], [2, 0, "bell-pepper", null, null], [1, 2, "carrot", null, "2026-09-12"], [1, 3, "carrot", null, "2026-09-12"], [2, 4, "watermelon", null, null]] },
    { name: "Fig", kind: "container", x: 33, y: 24, w: 2, h: 2, cx: 16, cy: 11, plants: [[0, 0, "fig", null, null]] },
  ];
  for (const b of sample) {
    const bed = must(await supabase.from("beds").insert({ name: b.name, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, compact_x: b.cx, compact_y: b.cy }).select().single()) as Bed;
    if (b.plants.length)
      must(await supabase.from("plantings").insert(b.plants.map(([cx, cy, slug, variety, date]) => ({ bed_id: bed.id, cell_x: cx, cell_y: cy, crop_slug: slug, variety, planted_on: date }))));
  }
}
