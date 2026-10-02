import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImagePlus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePlantIcon } from "@/lib/ai.functions";

/** Shrink to a small square WebP and clear the background: pixels connected to the edges that match the corner color become transparent. */
async function toSmallDataUrl(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const s = 160, c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const m = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
  const d = ctx.getImageData(0, 0, s, s), px = d.data;
  const g = (i: number) => px[i] ?? 0;
  const solid = [0, s - 1, s * (s - 1), s * s - 1].filter((i) => g(i * 4 + 3) > 200);
  if (solid.length) {
    const avg = (o: number) => solid.reduce((a, i) => a + g(i * 4 + o), 0) / solid.length;
    const r = avg(0), gr = avg(1), b = avg(2);
    const near = (i: number) => g(i * 4 + 3) > 0 && Math.abs(g(i * 4) - r) + Math.abs(g(i * 4 + 1) - gr) + Math.abs(g(i * 4 + 2) - b) < 90;
    const seen = new Uint8Array(s * s), stack: number[] = [];
    for (let i = 0; i < s; i++) stack.push(i, s * (s - 1) + i, i * s, i * s + s - 1);
    while (stack.length) {
      const i = stack.pop()!;
      if (seen[i] || !near(i)) continue;
      seen[i] = 1; px[i * 4 + 3] = 0;
      const x = i % s, y = (i / s) | 0;
      if (x > 0) stack.push(i - 1); if (x < s - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - s); if (y < s - 1) stack.push(i + s);
    }
    ctx.putImageData(d, 0, 0);
  }
  return c.toDataURL("image/webp", 0.9);
}

export function CustomIcon({ defaultSubject, current, onPick: choose }: { defaultSubject: string; current?: string | null; onPick: (dataUrl: string) => void }) {
  const qc = useQueryClient();
  const lib = useQuery({ queryKey: ["plant_pictures"], queryFn: async () => (await supabase.from("plant_pictures").select("id,label,data_url").order("created_at", { ascending: false })).data ?? [] });
  const onPick = async (u: string, label: string) => {
    choose(u);
    await supabase.from("plant_pictures").insert({ data_url: u, label });
    qc.invalidateQueries({ queryKey: ["plant_pictures"] });
  };
  const del = async (id: string) => { await supabase.from("plant_pictures").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["plant_pictures"] }); };
  const file = useRef<HTMLInputElement>(null);
  const gen = useServerFn(generatePlantIcon);
  const [subject, setSubject] = useState(defaultSubject);
  const [busy, setBusy] = useState(false);

  const upload = async (f: File) => {
    const url = URL.createObjectURL(f);
    try { await onPick(await toSmallDataUrl(url), f.name); toast.success("Picture saved"); }
    catch { toast.error("Couldn't read that image"); }
    finally { URL.revokeObjectURL(url); }
  };
  const make = async () => {
    setBusy(true);
    try {
      const { b64 } = await gen({ data: { subject } });
      await onPick(await toSmallDataUrl(`data:image/png;base64,${b64}`), subject);
      toast.success("Picture created");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't create a picture"); }
    finally { setBusy(false); }
  };

  return (
    <>
    {(lib.data?.length ?? 0) > 0 && (
      <div className="mt-2">
        <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">My pictures</div>
        <div className="flex flex-wrap gap-1">
          {lib.data!.map((p) => (
            <span key={p.id} className="group relative">
              <button title={p.label ?? ""} onClick={() => choose(p.data_url)} className={cn("h-9 w-9 overflow-hidden rounded-lg border-2 bg-muted p-0.5 hover:border-primary", current === p.data_url ? "border-primary bg-accent" : "border-transparent")}><img src={p.data_url} alt={p.label ?? ""} className="h-full w-full object-contain" /></button>
              <button aria-label="Delete picture" onClick={() => del(p.id)} className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground group-hover:flex">×</button>
            </span>
          ))}
        </div>
      </div>
    )}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <Button size="sm" variant="outline" onClick={() => file.current?.click()}><ImagePlus className="mr-1 h-4 w-4" />Upload photo</Button>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 w-44" placeholder="e.g. Cauliflower" />
      <Button size="sm" onClick={make} disabled={busy || subject.trim().length < 2}>
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}{busy ? "Drawing..." : "Create picture"}
      </Button>
    </div>
    </>
  );
}
