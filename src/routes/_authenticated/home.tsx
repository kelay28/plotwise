import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Check, Loader2, Shovel, Trash2 } from "lucide-react";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { PhotoLog } from "@/components/PhotoLog";
import { WeatherToday } from "@/components/WeatherToday";
import { VoicePlant } from "@/components/VoicePlant";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CROPS, CROP_MAP, PESTS, getCrop, plantName } from "@/lib/crops";
import { type Bed, type Planting, useBeds, usePests, usePlantings, useZone } from "@/lib/garden";
import { usePlans } from "@/lib/photos";
import { planPlantingDay, type PlantingPlanResult } from "@/lib/ai.functions";
import { fmt, fmtY, harvestInfo, inWindowNow } from "@/lib/zones";
import { cn } from "@/lib/utils";
import { PROP_TIMING, SEED_YEARS, STORAGE_TIPS, propWindow } from "@/lib/propagation";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home - Plotwise" }, { name: "description", content: "Planting suggestions, propagation ideas and your garden photo log." }] }),
  component: HomePage,
});

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAY = 86400000;

function openSpace(b: Bed, growing: Planting[]) {
  const mine = growing.filter((p) => p.bed_id === b.id);
  if (b.kind === "container") return mine.length ? 0 : 1;
  return b.w * b.h - mine.reduce((s, p) => s + (p.cell_w ?? 1) * (p.cell_h ?? 1), 0);
}

function HomePage() {
  const zone = useZone();
  const beds = useBeds().data ?? [];
  const plantings = usePlantings().data ?? [];
  const pests = usePests().data ?? [];
  const growing = plantings.filter((p) => p.status === "growing");
  const open = beds.filter((b) => openSpace(b, growing) > 0);

  const suggestions = CROPS.map((c) => ({ c, w: inWindowNow(c, zone) })).filter((x) => x.w)
    .map(({ c, w }) => ({ c, w: w!, bed: open.filter((b) => c.sun !== "full" || b.sun === "full").sort((a, b) => openSpace(b, growing) - openSpace(a, growing))[0] }))
    .sort((a, b) => a.w.end.getTime() - b.w.end.getTime()).slice(0, 8);
  const grownSlugs = [...new Set(plantings.filter((p) => p.status !== "removed").map((p) => p.crop_slug))].filter((s) => CROP_MAP[s]);
  const harvests = growing.map((p) => ({ p, h: harvestInfo(p, zone) })).filter((x) => x.h.daysLeft > -14).sort((a, b) => a.h.daysLeft - b.h.daysLeft).slice(0, 4);
  const openIssues = pests.filter((p) => !p.resolved).map((p) => ({ p, due: p.repeat_days ? new Date(new Date((p.last_treated_on ?? p.observed_on) + "T12:00").getTime() + p.repeat_days * DAY) : null }))
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
  const treatments = pests.filter((p) => !p.resolved && p.repeat_days).map((p) => ({ p, due: new Date(new Date((p.last_treated_on ?? p.observed_on) + "T12:00").getTime() + p.repeat_days! * DAY) }))
    .filter((x) => x.due.getTime() < Date.now() + 3 * DAY).slice(0, 4);

  return (
    <AppShell subtitle={`Hardiness Zone ${zone.toUpperCase()}`}>
      <div className="space-y-5">
        <div className={cn("grid gap-3", openIssues.length > 0 && "md:grid-cols-2")}>
          <WeatherToday />
          {openIssues.length > 0 && (
            <Link to="/pests" className="block rounded-3xl border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Open issues</span><span className="text-xs font-semibold text-primary">{openIssues.length}</span></div>
              {openIssues.slice(0, 3).map(({ p, due }) => (
                <div key={p.id} className="flex items-center gap-2 py-0.5 text-sm"><span>{PESTS_EMOJI(p.pest)}</span><span className="min-w-0 flex-1 truncate">{p.pest}</span>
                  {due && <span className={cn("shrink-0 rounded-full px-2 text-[10px] font-bold", due.getTime() <= Date.now() ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground")}>{due.getTime() <= Date.now() ? "Due today" : `Next ${fmt(due)}`}</span>}
                </div>
              ))}
            </Link>
          )}
        </div>
        <PlantingReport beds={[...beds].sort((a, b) => openSpace(b, growing) - openSpace(a, growing))} growing={growing} />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <SectionLabel>Suggested plantings · now</SectionLabel>
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">Nothing is in its planting window right now.</p>}
            <div className="divide-y">
              {suggestions.map(({ c, w, bed }) => (
                <Link key={c.slug} to="/library/$slug" params={{ slug: c.slug }} className="flex items-center gap-3 py-2">
                  <PlantIcon slug={c.slug} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm font-semibold"><span>{c.name}</span><span className="text-xs text-muted-foreground">until {fmt(w.end)}</span></div>
                    <div className="truncate text-xs text-muted-foreground">{bed ? `Fits ${bed.name} (${openSpace(bed, growing)} sq ft open)` : "No open bed with the right sun"} · {c.sunHours}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
          <PropagationCard slugs={grownSlugs} zone={zone} />
        </div>
        <Card>
          <SectionLabel>Coming up</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              {harvests.length === 0 && <p className="text-sm text-muted-foreground">No harvests soon.</p>}
              {harvests.map(({ p, h }) => (
                <Link key={p.id} to="/beds/$bedId" params={{ bedId: p.bed_id }} className="flex items-center gap-2 text-sm">
                  <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={26} />
                  <span className="flex-1 font-medium">{plantName(p)}</span>
                  <span className={cn("text-xs", h.daysLeft <= 0 && "font-semibold text-primary")}>{h.daysLeft <= 0 ? "Ready" : `${h.daysLeft}d · ${fmt(h.harvest)}`}</span>
                </Link>
              ))}
              <Link to="/log" className="text-xs font-semibold text-primary">Full planting log</Link>
            </div>
            <div className="space-y-2">
              {treatments.length === 0 && <p className="text-sm text-muted-foreground">No pest treatments due.</p>}
              {treatments.map(({ p, due }) => (
                <Link key={p.id} to="/pests" className="flex items-center gap-2 text-sm"><span>🐛</span><span className="flex-1 font-medium">{p.pest}{p.treatment ? ` · ${p.treatment}` : ""}</span><span className="text-xs text-warning-foreground">{due.getTime() < Date.now() ? "Due now" : `Due ${fmt(due)}`}</span></Link>
              ))}
              <Link to="/pests" className="text-xs font-semibold text-primary">All pests</Link>
            </div>
          </div>
        </Card>
        <PhotoLog limit={12} />
      </div>
    </AppShell>
  );
}

function PlantingReport({ beds, growing }: { beds: Bed[]; growing: Planting[] }) {
  const [mode, setMode] = useState<"now" | "plan">("now");
  const [date, setDate] = useState(iso(new Date(Date.now() + 7 * DAY)));
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PlantingPlanResult | null>(null);
  const run = useServerFn(planPlantingDay);
  const plans = usePlans();
  const qc = useQueryClient();
  const ask = async () => {
    setBusy(true);
    try { setRes(await run({ data: { date, wish: wish.trim(), today: iso(new Date()) } })); }
    catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const savePlan = async () => {
    if (!res) return;
    const { error } = await supabase.from("planting_plans").insert({ planned_on: date, title: res.summary, checklist: res as never });
    if (error) { toast.error(error.message); return; }
    toast.success("Plan saved"); setRes(null); qc.invalidateQueries({ queryKey: ["plans"] });
  };
  const setStatus = async (id: string, status: string | null) => {
    const q = status ? supabase.from("planting_plans").update({ status }).eq("id", id) : supabase.from("planting_plans").delete().eq("id", id);
    const { error } = await q;
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["plans"] });
  };
  const upcoming = (plans.data ?? []).filter((p) => p.status === "planned");
  const [full, setFull] = useState<string | null>(null);
  const fullPlan = upcoming.find((p) => p.id === full);

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <Card className="space-y-2 bg-ink text-ink-foreground">
          <h2 className="text-lg font-bold">Planned days</h2>
          {upcoming.map((p) => {
            const r = p.checklist as unknown as PlantingPlanResult;
            return (
              <details key={p.id} className="rounded-xl bg-ink-foreground/10 px-3 py-2 text-sm">
                <summary className="flex cursor-pointer items-center gap-2">
                  <span className="font-semibold">{fmt(new Date(p.planned_on + "T12:00"))}</span><span className="flex-1 truncate opacity-75">{p.title}</span>
                  <button onClick={(e) => { e.preventDefault(); setStatus(p.id, "done"); }} aria-label="Mark done"><Check className="h-4 w-4" /></button>
                  <button onClick={(e) => { e.preventDefault(); setStatus(p.id, null); }} aria-label="Delete plan"><Trash2 className="h-4 w-4" /></button>
                </summary>
                <button onClick={() => setFull(p.id)} className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline">See full report</button>
                {r?.crops && <ul className="mt-2 ml-4 list-disc opacity-80">{r.crops.map((c) => <li key={c.name + c.bed_name}>{c.name} in {c.bed_name}</li>)}{r.checklist?.map((c) => <li key={c}>{c}</li>)}</ul>}
              </details>
            );
          })}
        </Card>
      )}
      <Dialog open={!!fullPlan} onOpenChange={(o) => !o && setFull(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Planting day · {fullPlan ? fmt(new Date(fullPlan.planned_on + "T12:00")) : ""}</DialogTitle></DialogHeader>
          {fullPlan && <ReportView r={fullPlan.checklist as unknown as PlantingPlanResult} />}
          <p className="text-[11px] text-muted-foreground">AI-sourced, please verify.</p>
        </DialogContent>
      </Dialog>

    <Card className="bg-ink text-ink-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold">Planting report</h2>
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-ink-foreground/10 p-1 sm:w-auto">
          <button onClick={() => setMode("now")} className={cn("flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold", mode === "now" && "bg-primary text-primary-foreground")}><Shovel className="h-4 w-4 shrink-0" />Add planting</button>
          <button onClick={() => setMode("plan")} className={cn("flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold", mode === "plan" && "bg-primary text-primary-foreground")}><CalendarDays className="h-4 w-4 shrink-0" />Plan a day</button>
        </div>
      </div>
      {mode === "now" ? (
        <div className="mt-4">
          <VoicePlant className="mb-4 text-foreground" />
          <Link to="/map" search={{ add: true }} className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-primary-foreground shadow hover:opacity-95">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/20"><Plus className="h-6 w-6" /></span>
            <span><span className="block font-bold">Start a new bed or patch</span><span className="text-sm opacity-85">Draw it on the map, name it, then drag crops in.</span></span>
          </Link>
          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider opacity-60">Or add to an existing bed</p>
          <div className="flex flex-wrap gap-2">
            {beds.length === 0 && <p className="text-sm opacity-75">No beds yet. <Link to="/map" search={{ add: true }} className="text-primary">Add a bed</Link></p>}
            {beds.map((b) => (
              <Link key={b.id} to="/beds/$bedId" params={{ bedId: b.id }} className="rounded-xl bg-card px-3 py-2 text-sm text-card-foreground hover:ring-2 hover:ring-primary">
                <div className="font-semibold">{b.name}</div><div className="text-xs text-muted-foreground">{openSpace(b, growing) > 0 ? `${openSpace(b, growing)} sq ft open` : "Full"} · {b.sun} sun</div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-card text-card-foreground sm:w-44" />
            <Input value={wish} onChange={(e) => setWish(e.target.value)} placeholder='Optional, e.g. "garlic and fall greens"' className="flex-1 bg-card text-card-foreground" />
            <Button onClick={ask} disabled={busy || !date}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{busy ? "Planning..." : "Build report"}</Button>
          </div>
          {res && (
            <div className="space-y-3 rounded-2xl bg-card p-4 text-card-foreground">
              <ReportView r={res} />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">AI-sourced, please verify.</p>
                <Button size="sm" onClick={savePlan}>Save plan for {fmt(new Date(date + "T12:00"))}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
    </div>
  );
}

function ReportView({ r }: { r: PlantingPlanResult }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{r.summary}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">What to plant</h4>
          {(r.crops ?? []).map((c) => (
            <div key={c.name + c.bed_name} className="flex gap-2 py-1 text-sm"><PlantIcon slug={c.crop_slug} size={24} /><div><span className="font-semibold">{c.name}</span> <span className="text-xs text-muted-foreground">in {c.bed_name}</span><p className="text-xs text-muted-foreground">{c.why}</p></div></div>
          ))}
        </div>
        <div className="space-y-3 text-sm">
          <List t="Weather & frost" items={r.weather ?? []} />
          <List t="Before the day" items={r.prep ?? []} />
          <List t="On the day" items={r.checklist ?? []} />
        </div>
      </div>
    </div>
  );
}

const List = ({ t, items }: { t: string; items: string[] }) => (
  <div><h4 className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{t}</h4><ul className="ml-4 list-disc">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
);

function PropagationCard({ slugs, zone }: { slugs: string[]; zone: string }) {
  const [f, setF] = useState<"all" | "prop" | "seed">("all");
  // Things you grow first, then indoor-friendly favorites like basil.
  const propSlugs = [...new Set([...slugs.filter((s) => PROP_TIMING[s]), ...Object.keys(PROP_TIMING).filter((s) => PROP_TIMING[s]!.indoor && CROP_MAP[s])])]
    .map((s) => ({ s, w: propWindow(s, zone)!, mine: slugs.includes(s) })).filter((x) => x.w)
    .sort((a, b) => Number(b.w.now) - Number(a.w.now) || Number(b.mine) - Number(a.mine) || a.w.start.getTime() - b.w.start.getTime()).slice(0, 8);
  const seedSlugs = slugs.slice(0, 8);
  return (
    <Card>
      <div className="mb-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Propagation & seeds</h3>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {([["all", "All"], ["prop", "Propagation"], ["seed", "Seed saving"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setF(k)} className={cn("whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold", f === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {f !== "seed" && (
          <div className="space-y-3">
            {f === "all" && <h4 className="text-[10px] font-bold uppercase text-primary">When to propagate</h4>}
            {propSlugs.map(({ s, w, mine }) => (
              <div key={s} className="flex gap-3">
                <PlantIcon slug={s} size={30} />
                <div className="text-sm">
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold">{getCrop(s).name}
                    <span className={cn("rounded-full px-1.5 text-[10px] font-bold", w.now ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{w.now ? `Now - until ${fmt(w.end)}` : `${fmt(w.start)} - ${fmt(w.end)}`}</span>
                    {w.indoor && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">Indoors</span>}
                    {!mine && <span className="text-[10px] font-normal text-muted-foreground">not in your garden</span>}
                  </div>
                  <p className="text-muted-foreground">{w.how}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {f !== "prop" && (
          <div className="space-y-3">
            {f === "all" && <h4 className="text-[10px] font-bold uppercase text-primary">Seed saving</h4>}
            {seedSlugs.length === 0 && <p className="text-sm text-muted-foreground">Plant something to see seed-saving tips.</p>}
            {seedSlugs.map((s) => { const c = getCrop(s); return (
              <div key={s} className="flex gap-3">
                <PlantIcon slug={s} size={30} />
                <div className="text-sm"><div className="font-semibold">{c.name}{SEED_YEARS[s] ? <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">seeds keep ~{SEED_YEARS[s]} yr</span> : null}</div><p className="text-muted-foreground">{c.seedSaving}</p></div>
              </div>
            ); })}
            <div className="rounded-2xl bg-muted p-3">
              <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Storing seeds</div>
              <ul className="ml-4 list-disc space-y-0.5 text-sm">{STORAGE_TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

const PESTS_EMOJI = (name: string) => Object.values(PESTS).find((x) => x.name === name)?.emoji ?? "🐛";
