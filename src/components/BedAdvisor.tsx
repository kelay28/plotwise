import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Sprout } from "lucide-react";
import { Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestForBed } from "@/lib/ai.functions";
import { CROP_MAP } from "@/lib/crops";

type Res = Awaited<ReturnType<typeof suggestForBed>>;

export function BedAdvisor({ bedId }: { bedId: string }) {
  const run = useServerFn(suggestForBed);
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const ask = async () => {
    setBusy(true);
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setRes(await run({ data: { bedId, today, wish: wish.trim() } }));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  return (
    <Card>
      <SectionLabel>What should I plant here?</SectionLabel>
      <p className="mb-2 text-sm text-muted-foreground">Uses this bed's type, size, sun, soil notes and past plantings.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={wish} onChange={(e) => setWish(e.target.value)} placeholder='Optional, e.g. "something for salads" or "pollinator friendly"' className="flex-1" />
        <Button onClick={ask} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sprout className="mr-1 h-4 w-4" />}{busy ? "Thinking..." : "Suggest crops"}</Button>
      </div>
      {res && (
        <div className="mt-4 space-y-3">
          <p className="text-sm">{res.summary}</p>
          {res.suggestions.map((s) => {
            const known = !!CROP_MAP[s.crop_slug];
            return (
              <div key={s.name} className="rounded-2xl border p-3">
                <div className="flex items-start gap-3">
                  <PlantIcon slug={s.crop_slug} size={36} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      {known ? <Link to="/library/$slug" params={{ slug: s.crop_slug }} className="font-semibold hover:text-primary">{s.name}</Link> : <span className="font-semibold">{s.name}</span>}
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">{s.when}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.why}</p>
                    <div className="mt-2 text-[10px] font-bold uppercase text-muted-foreground">Before planting</div>
                    <ul className="ml-4 list-disc text-sm">{s.prep.map((p) => <li key={p}>{p}</li>)}</ul>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">AI-sourced, please verify.</p>
        </div>
      )}
    </Card>
  );
}
