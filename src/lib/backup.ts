import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * JSON backup/restore of a user's garden. The file format matches the Lovable-era export
 * ({ exported_at, profiles: [...], beds: [...], ... }) so old backups import too.
 * Photos are not included: garden_photos rows point at storage files that don't travel with the JSON.
 */

type Row = { id?: unknown; user_id?: unknown; bed_id?: unknown; planting_id?: unknown; zone?: unknown; garden_name?: unknown; yard_w?: unknown; yard_h?: unknown; [col: string]: unknown };

// Insert order respects foreign keys (beds before plantings, plantings before pest_logs...).
const TABLES = ["beds", "bed_sections", "plant_varieties", "plantings", "bed_notes", "pest_logs", "yard_features", "planting_plans", "crop_icons", "plant_pictures"] as const;
type Table = (typeof TABLES)[number];

const Backup = z
  .object({ profiles: z.array(z.record(z.unknown())).optional() })
  .catchall(z.unknown())
  .refine((d) => TABLES.some((t) => Array.isArray(d[t])), "This doesn't look like a Plotwise backup file.");

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

const db = (t: string) => supabase.from(t as never);

/** Everything the signed-in user owns, in the backup format. */
export async function buildBackup() {
  const id = await uid();
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  const prof = await db("profiles").select("*").eq("id", id);
  if (prof.error) throw new Error(prof.error.message);
  out["profiles"] = prof.data;
  for (const t of [...TABLES, "garden_photos"]) {
    const r = await db(t).select("*");
    if (r.error) throw new Error(`${t}: ${r.error.message}`);
    out[t] = r.data;
  }
  return out;
}

export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupFilename = () => `plotwise-backup-${new Date().toISOString().slice(0, 10)}.json`;

/** Parse and sanity-check a backup file before anything is changed. */
export async function readBackupFile(file: File) {
  if (file.size > 25 * 1024 * 1024) throw new Error("That file is too big to be a Plotwise backup.");
  let json: unknown;
  try { json = JSON.parse(await file.text()); } catch { throw new Error("That file isn't valid JSON."); }
  const parsed = Backup.safeParse(json);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid backup file.");
  const d = parsed.data as Record<string, unknown>;
  const rows = (t: string) => (Array.isArray(d[t]) ? (d[t] as Row[]) : []);
  return { rows, counts: { beds: rows("beds").length, plantings: rows("plantings").length } };
}

/**
 * Replace the signed-in user's garden with the backup's contents.
 * Every row gets a fresh id (so a backup from another account or an earlier copy never collides),
 * and references between rows are remapped to the new ids.
 */
export async function restoreBackup(rows: (t: string) => Row[]) {
  const id = await uid();
  const ids = new Map<string, string>();
  const fresh = (old: unknown) => {
    const n = crypto.randomUUID();
    if (typeof old === "string") ids.set(old, n);
    return n;
  };
  const ref = (old: unknown) => (typeof old === "string" ? (ids.get(old) ?? null) : null);

  // Clear the current garden (children first). Photos are kept.
  for (const t of [...TABLES].reverse()) {
    const r = await db(t).delete().eq("user_id", id);
    if (r.error) throw new Error(`Clearing ${t}: ${r.error.message}`);
  }

  const p = rows("profiles")[0];
  if (p) {
    const r = await db("profiles").upsert({ id, zone: p.zone, garden_name: p.garden_name, yard_w: p.yard_w ?? null, yard_h: p.yard_h ?? null } as never);
    if (r.error) throw new Error(`Profile: ${r.error.message}`);
  }

  const prepared: Record<Table, Row[]> = {
    beds: rows("beds").map((r) => ({ ...r, id: fresh(r.id) })),
    plant_varieties: rows("plant_varieties").map((r) => ({ ...r, id: fresh(r.id) })),
    bed_sections: [],
    plantings: [],
    bed_notes: [],
    pest_logs: [],
    yard_features: rows("yard_features").map((r) => ({ ...r, id: fresh(r.id) })),
    planting_plans: [],
    crop_icons: rows("crop_icons").map((r) => ({ ...r })),
    plant_pictures: rows("plant_pictures").map((r) => ({ ...r, id: fresh(r.id) })),
  };
  // Rows that point at a bed are dropped if that bed isn't in the file.
  prepared.plantings = rows("plantings").flatMap((r) => (ref(r.bed_id) ? [{ ...r, bed_id: ref(r.bed_id), id: fresh(r.id) }] : []));
  prepared.bed_sections = rows("bed_sections").flatMap((r) => (ref(r.bed_id) ? [{ ...r, bed_id: ref(r.bed_id), id: fresh(r.id) }] : []));
  prepared.bed_notes = rows("bed_notes").flatMap((r) => (ref(r.bed_id) ? [{ ...r, bed_id: ref(r.bed_id), id: fresh(r.id) }] : []));
  prepared.pest_logs = rows("pest_logs").map((r) => ({ ...r, id: fresh(r.id), bed_id: ref(r.bed_id), planting_id: ref(r.planting_id), photo_id: null }));
  prepared.planting_plans = rows("planting_plans").map((r) => ({ ...r, id: fresh(r.id), bed_id: ref(r.bed_id) }));

  for (const t of TABLES) {
    const list = prepared[t].map(({ user_id: _u, ...r }) => r);
    for (let i = 0; i < list.length; i += 50) {
      const r = await db(t).insert(list.slice(i, i + 50) as never);
      if (r.error) throw new Error(`Restoring ${t}: ${r.error.message}`);
    }
  }
}
