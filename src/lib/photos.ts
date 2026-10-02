import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type GardenPhoto = Database["public"]["Tables"]["garden_photos"]["Row"] & { url: string | null };
export type PlantingPlan = Database["public"]["Tables"]["planting_plans"]["Row"];
const BUCKET = "garden-photos";

/** Photos, newest first, with short-lived signed links (the bucket is private). */
export function usePhotos(f: { bedId?: string | undefined; plantingId?: string | undefined; limit?: number | undefined } = {}) {
  return useQuery({
    queryKey: ["photos", f.bedId ?? null, f.plantingId ?? null, f.limit ?? 60],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<GardenPhoto[]> => {
      let q = supabase.from("garden_photos").select("*").order("taken_on", { ascending: false }).order("created_at", { ascending: false }).limit(f.limit ?? 60);
      if (f.bedId) q = q.eq("bed_id", f.bedId);
      if (f.plantingId) q = q.eq("planting_id", f.plantingId);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      if (!rows.length) return [];
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 3600);
      return rows.map((r, i) => ({ ...r, url: data?.[i]?.signedUrl ?? null }));
    },
  });
}

async function shrink(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => { throw new Error(`Couldn't read ${file.name}. Try a JPG or PNG.`); });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process photo"))), "image/jpeg", 0.85));
}

export type PhotoMeta = { scope: "garden" | "bed" | "planting"; bed_id: string | null; planting_id: string | null; caption: string | null; taken_on: string };

export function useUploadPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ files, meta }: { files: File[]; meta: PhotoMeta }) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      const ids: string[] = [];
      for (const file of files) {
        const blob = await shrink(file);
        const path = `${data.user.id}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw new Error(up.error.message);
        const ins = await supabase.from("garden_photos").insert({ ...meta, storage_path: path }).select("id").single();
        if (ins.error) throw new Error(ins.error.message);
        ids.push(ins.data.id);
      }
      return ids;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: GardenPhoto) => {
      await supabase.storage.from(BUCKET).remove([p.storage_path]);
      const { error } = await supabase.from("garden_photos").delete().eq("id", p.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });
}

export const usePlans = () =>
  useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planting_plans").select("*").order("planned_on");
      if (error) throw new Error(error.message);
      return data as PlantingPlan[];
    },
  });

/** Downsized JPEG data URL, for sending a photo to the AI. */
export async function toDataUrl(file: File, max = 1024) {
  const b = await shrink(file, max);
  return new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(b); });
}
