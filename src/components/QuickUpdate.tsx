import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareText } from "lucide-react";
import { Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { proposeLogUpdates } from "@/lib/ai.functions";
import { getCrop, plantName } from "@/lib/crops";
import { type Planting, useZone } from "@/lib/garden";
import { harvestInfo } from "@/lib/zones";

type Res = Awaited<ReturnType<typeof proposeLogUpdates>>;

export function QuickUpdate({ plantings, bedName }: { plantings: Planting[]; bedName: (id: string) => string }) {
  const propose = useServerFn(proposeLogUpdates);
  const zone = useZone();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());

  const ask = async () => {
    if (msg.trim().length < 2) return;
    setBusy(true); setRes(null); setSkip(new Set());
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setRes(await propose({ data: { message: msg.trim(), today } }));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const apply = async () => {
    if (!res) return;
    setBusy(true);
    const stamp = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    try {
      for (const u of res.updates.filter((u) => !skip.has(u.id))) {
        const p = plantings.find((x) => x.id === u.id);
        if (!p) continue;
        const patch: Partial<Planting> = {};
        if (u.planted_on) patch.planted_on = u.planted_on;
        if (u.method) patch.method = u.method;
        if (u.expected_harvest) {
          const planted = harvestInfo({ ...p, planted_on: patch.planted_on ?? p.planted_on }, zone).planted;
          const d = Math.round((new Date(u.expected_harvest + "T12:00").getTime() - planted.getTime()) / 86400000);
          if (d > 0) patch.days_to_maturity = d;
        }
        if (u.status) patch.status = u.status;
        if (u.add_note) patch.notes = [p.notes, `${stamp}: ${u.add_note}`].filter(Boolean).join("\n");
        const { error } = await supabase.from("plantings").update(patch).eq("id", u.id);
        if (error) throw error;
      }
      toast.success("Planting log updated");
      setRes(null); setMsg("");
      qc.invalidateQueries({ queryKey: ["plantings"] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const chosen = res ? res.updates.filter((u) => !skip.has(u.id)).length : 0;
  return (
    <Card className="mb-5">
      <SectionLabel>Quick update</SectionLabel>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} className="flex-1"
          placeholder={'Tell Plotwise what happened, e.g. "Potatoes were all planted today. Cucumbers are 5-6 inches, no fruit yet."'}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }} />
        <Button onClick={ask} disabled={busy || msg.trim().length < 2} className="sm:self-end">
          <MessageSquareText className="mr-1 h-4 w-4" />{busy && !res ? "Reading..." : "Suggest changes"}
        </Button>
      </div>
      {res && (
        <div className="mt-4 rounded-2xl border bg-muted/40 p-3">
          <p className="mb-2 text-sm">{res.reply}</p>
          {res.updates.length > 0 && (
            <>
              <ul className="divide-y">
                {res.updates.map((u) => {
                  const p = plantings.find((x) => x.id === u.id);
                  if (!p) return null;
                  return (
                    <li key={u.id} className="flex items-start gap-3 py-2">
                      <Checkbox className="mt-1" checked={!skip.has(u.id)} onCheckedChange={(c) => setSkip((s) => { const n = new Set(s); c ? n.delete(u.id) : n.add(u.id); return n; })} />
                      <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={28} />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-semibold">{plantName(p)} <span className="font-normal text-muted-foreground">· {bedName(p.bed_id)}</span></div>
                        <div className="text-xs text-muted-foreground">
                          {[u.planted_on && `Planted on ${u.planted_on}`, u.expected_harvest && `Harvest ~${u.expected_harvest}`, u.method && `Method: ${u.method}`, u.status && `Status: ${u.status}`, u.add_note && `Note: "${u.add_note}"`].filter(Boolean).join(" · ") || u.summary}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRes(null)}>Discard</Button>
                <Button size="sm" onClick={apply} disabled={busy || chosen === 0}>Apply {chosen} change{chosen === 1 ? "" : "s"}</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
