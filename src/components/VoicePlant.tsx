import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mic, MicOff, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlantIcon } from "@/components/PlantIcon";
import { supabase } from "@/integrations/supabase/client";
import { getCrop } from "@/lib/crops";
import { proposePlantings, type PlantProposal } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

type SR = { start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; continuous: boolean; interimResults: boolean; lang: string };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Speak or type what you planted and where; AI places it, you review, then it's added. */
export function VoicePlant({ bedId, className }: { bedId?: string; className?: string }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ reply: string; plantings: PlantProposal[] } | null>(null);
  const rec = useRef<SR | null>(null);
  const base = useRef("");
  const run = useServerFn(proposePlantings);
  const qc = useQueryClient();

  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(!!(W.SpeechRecognition || W.webkitSpeechRecognition));
  }, []);

  const toggleMic = () => {
    if (listening) { rec.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!C) return;
    const r = new C();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    base.current = text ? text.trim() + " " : "";
    r.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i]![0]!.transcript; setText(base.current + t); };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast.error("Couldn't hear you - check microphone permission."); };
    rec.current = r; r.start(); setListening(true);
  };

  const ask = async () => {
    rec.current?.stop();
    setBusy(true);
    try { setRes(await run({ data: { message: text.trim(), today: iso(new Date()), bedId: bedId ?? null } })); }
    catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const apply = async () => {
    if (!res?.plantings.length) return;
    const rows = res.plantings.map((p) => ({ bed_id: p.bed_id, crop_slug: p.crop_slug, variety: p.variety, cell_x: p.x, cell_y: p.y, cell_w: p.w, cell_h: p.h, planted_on: p.planted_on, method: p.method, stage: p.stage, status: "growing" }));
    const { error } = await supabase.from("plantings").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${rows.length} planting${rows.length > 1 ? "s" : ""}`);
    qc.invalidateQueries({ queryKey: ["plantings"] });
    setRes(null); setText("");
  };

  return (
    <div className={cn("rounded-3xl border bg-card p-4 shadow-sm", className)}>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-bold">Say what you planted</h3>
      </div>
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="min-h-0 flex-1 resize-none"
          placeholder={bedId ? '"4 bell peppers in a row along the top, and basil in the bottom left corner"' : '"Planted a row of 4 bell peppers along the top of Greens today"'} />
        {supported && (
          <button onClick={toggleMic} aria-label={listening ? "Stop dictation" : "Start dictation"}
            className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", listening ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")}>
            {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{listening ? "Listening... tap the mic to stop." : "Say the crop, where it goes and how much space it takes."}</p>
        <Button size="sm" onClick={ask} disabled={busy || text.trim().length < 2}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{busy ? "Placing..." : "Place it"}</Button>
      </div>
      {res && (
        <div className="mt-3 space-y-2 rounded-2xl bg-muted p-3">
          <p className="text-sm">{res.reply}</p>
          {res.plantings.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-card p-2 text-sm">
              <PlantIcon slug={p.crop_slug} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{getCrop(p.crop_slug).name}{p.variety ? ` · ${p.variety}` : ""}</div>
                <div className="text-xs text-muted-foreground">{p.bed_name} · {p.w}×{p.h} ft at square {p.x + 1},{p.y + 1} · {p.method === "seed" ? "seeded" : "transplant"}{p.planted_on ? ` ${p.planted_on}` : ""}</div>
              </div>
              <button aria-label="Remove" onClick={() => setRes({ ...res, plantings: res.plantings.filter((_, j) => j !== i) })}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRes(null)}>Cancel</Button>
            {res.plantings.length > 0 && <Button size="sm" onClick={apply}>Add {res.plantings.length} to garden</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
