import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, Pencil, Sparkles } from "lucide-react";
import { diagnoseIssue, generatePlantIcon, type Diagnosis } from "@/lib/ai.functions";
import { toDataUrl, usePhotos, useUploadPhotos } from "@/lib/photos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCrop, PESTS, type PestKey, plantName } from "@/lib/crops";
import { useBeds, usePests, usePlantings, useRemove, useUpsert } from "@/lib/garden";
import { fmt } from "@/lib/zones";

export const Route = createFileRoute("/_authenticated/pests")({
  validateSearch: z.object({ planting: z.string().optional() }),
  head: () => ({ meta: [{ title: "Issues - Plotwise" }, { name: "description", content: "Log pests and plant problems and get what to do about them." }] }),
  component: PestsPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function PestsPage() {
  const { planting } = Route.useSearch();
  const pests = usePests();
  const plantings = usePlantings();
  const beds = useBeds();
  const up = useUpsert("pest_logs");
  const rm = useRemove("pest_logs");
  const growing = (plantings.data ?? []).filter((p) => p.status === "growing");
  const label = (pid: string | null) => { const p = growing.find((x) => x.id === pid) ?? plantings.data?.find((x) => x.id === pid); return p ? plantName(p) : ""; };
  const bedName = (id: string | null) => beds.data?.find((b) => b.id === id)?.name ?? "";

  const active = (pests.data ?? []).filter((p) => !p.resolved);
  const resolved = (pests.data ?? []).filter((p) => p.resolved);
  const photos = usePhotos({ limit: 500 });
  const photoUrl = (id: string | null) => (id ? photos.data?.find((x) => x.id === id)?.url ?? null : null);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <AppShell title="Issues" subtitle={`${active.length} open`}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {active.length === 0 && <Card><p className="text-sm text-muted-foreground">No open issues. 🎉</p></Card>}
          {active.map((p) => {
            const next = p.repeat_days && p.last_treated_on ? new Date(new Date(p.last_treated_on + "T12:00").getTime() + p.repeat_days * 86400000) : null;
            const due = next && next.getTime() <= Date.now();
            const pl = plantings.data?.find((x) => x.id === p.planting_id);
            return (
              <Card key={p.id}>
                <div className="flex items-start gap-3">
                  {photoUrl(p.photo_id) ? <img src={photoUrl(p.photo_id)!} alt={p.pest} className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : pl ? <PlantIcon slug={pl.crop_slug} color={pl.color} icon={pl.icon} size={40} /> : <span className="text-3xl">🐛</span>}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{p.pest}</h3>
                      {due && <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">Treatment due</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{label(p.planting_id)}{p.bed_id ? ` · ${bedName(p.bed_id)}` : ""} · seen {fmt(new Date(p.observed_on + "T12:00"))}</p>
                    {p.treatment && <p className="mt-2 text-sm">{p.treatment}</p>}
                    {next && <p className="mt-1 text-xs font-semibold text-primary">Next treatment: {fmt(next)} (every {p.repeat_days} days)</p>}
                    {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => up.mutate({ id: p.id, last_treated_on: today() } as never, { onSuccess: () => toast.success("Treatment logged") })}>Treated today</Button>
                      <Button size="sm" variant="outline" onClick={() => up.mutate({ id: p.id, resolved: true } as never)}>Resolved</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p.id)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {resolved.length > 0 && (
            <Card>
              <SectionLabel>Resolved</SectionLabel>
              {resolved.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                  <span>{p.pest} <span className="text-xs text-muted-foreground">· {label(p.planting_id)} · {fmt(new Date(p.observed_on + "T12:00"))}</span></span>
                  <span className="flex gap-3"><button className="text-xs text-primary" onClick={() => setEditing(p.id)}>Edit</button><button className="text-xs text-muted-foreground" onClick={() => rm.mutate(p.id)}>Delete</button></span>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="order-first min-w-0 lg:order-none"><IssueForm initialPlanting={planting} /></div>
      </div>
      <EditIssue issue={(pests.data ?? []).find((x) => x.id === editing) ?? null} photoUrl={photoUrl} onClose={() => setEditing(null)} />
    </AppShell>
  );
}

function IssueForm({ initialPlanting }: { initialPlanting?: string | undefined }) {
  const plantings = usePlantings();
  const beds = useBeds();
  const up = useUpsert("pest_logs");
  const upload = useUploadPhotos();
  const diag = useServerFn(diagnoseIssue);
  const growing = (plantings.data ?? []).filter((p) => p.status === "growing");
  const [pid, setPid] = useState<string>(initialPlanting ?? "");
  const [kind, setKind] = useState<PestKey | "custom" | null>(null);
  const [custom, setCustom] = useState("");
  const [treatment, setTreatment] = useState("");
  const [repeat, setRepeat] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [ai, setAi] = useState<Diagnosis | null>(null);
  const [busy, setBusy] = useState(false);
  const cam = useRef<HTMLInputElement>(null);
  const sel = growing.find((p) => p.id === pid);
  const suggested = sel ? getCrop(sel.crop_slug).pests : [];
  const all = (Object.keys(PESTS) as PestKey[]).sort((a, b) => Number(suggested.includes(b)) - Number(suggested.includes(a)));
  const pick = (k: PestKey | "custom") => { setKind(k); setTreatment(k === "custom" ? "" : PESTS[k].treatment); setRepeat(k === "custom" ? "" : String(PESTS[k].repeatDays ?? "")); };
  const info = kind && kind !== "custom" ? PESTS[kind] : null;

  async function check() {
    setBusy(true);
    try {
      const image = photo ? await toDataUrl(photo) : null;
      const r = await diag({ data: { text: notes, crop: sel ? plantName(sel) : null, image } });
      setAi(r);
      if (r.pest_key in PESTS) pick(r.pest_key as PestKey); else { setKind("custom"); setCustom(r.likely); }
      setTreatment(r.treatment); setRepeat(r.repeat_days ? String(r.repeat_days) : "");
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  }
  async function save() {
    const name = kind === "custom" ? custom.trim() : kind ? PESTS[kind].name : "";
    if (!name) { toast.error("Pick what you're seeing"); return; }
    let photo_id: string | null = null;
    try {
      if (photo) photo_id = (await upload.mutateAsync({ files: [photo], meta: { scope: sel ? "planting" : "garden", bed_id: sel?.bed_id ?? null, planting_id: sel?.id ?? null, caption: name, taken_on: today() } }))[0] ?? null;
    } catch (e) { toast.error((e as Error).message); return; }
    up.mutate({ planting_id: sel?.id ?? null, bed_id: sel?.bed_id ?? null, pest: name, treatment: treatment || null, repeat_days: repeat ? +repeat : null, last_treated_on: null, notes: notes || null, photo_id } as never, {
      onSuccess: () => { toast.success("Issue logged"); setKind(null); setNotes(""); setPhoto(null); setAi(null); setTreatment(""); setRepeat(""); },
      onError: (e) => toast.error(e.message),
    });
  }
  const bedName = (id: string) => beds.data?.find((b) => b.id === id)?.name ?? "";

  return (
    <Card className="min-w-0 space-y-4">
      <SectionLabel>Log an issue</SectionLabel>
      <div>
        <Label>1. Which plant?</Label>
        <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setPid("")} className={cn("shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-semibold", !pid ? "border-primary bg-accent" : "border-transparent bg-muted")}>General</button>
          {growing.map((p) => (
            <button key={p.id} onClick={() => setPid(p.id)} className={cn("flex shrink-0 items-center gap-1 rounded-full border-2 py-1 pl-1 pr-2.5 text-xs font-medium", pid === p.id ? "border-primary bg-accent" : "border-transparent bg-muted")}>
              <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={24} /><span className="whitespace-nowrap">{plantName(p)} · {bedName(p.bed_id)}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>2. What do you see?</Label>
        <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
          {all.map((k) => (
            <button key={k} onClick={() => pick(k)} className={cn("flex items-center gap-1.5 rounded-xl border-2 px-2 py-2 text-left text-xs font-semibold", kind === k ? "border-primary bg-accent" : "border-transparent bg-muted")}>
              <span className="text-base">{PESTS[k].emoji ?? "🐛"}</span><span className="min-w-0 flex-1">{PESTS[k].name}</span>{suggested.includes(k) && <span title="Common on this plant">⭐</span>}
            </button>
          ))}
          <button onClick={() => pick("custom")} className={cn("rounded-xl border-2 px-2 py-2 text-left text-xs font-semibold", kind === "custom" ? "border-primary bg-accent" : "border-transparent bg-muted")}>❓ Something else</button>
        </div>
        {kind === "custom" && <Input className="mt-2" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Name it" />}
      </div>
      <div>
        <Label>3. Photo & notes (optional)</Label>
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" onClick={() => cam.current?.click()}><Camera className="mr-1 h-4 w-4" />{photo ? "Retake" : "Photo"}</Button>
          <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { setPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. holes in lower leaves, white powder" />
        </div>
        {photo && <img src={URL.createObjectURL(photo)} alt="" className="mt-2 h-24 w-24 rounded-xl object-cover" />}
        <Button variant="secondary" className="mt-2 w-full" onClick={check} disabled={busy || (!photo && !notes.trim())}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}{busy ? "Checking..." : "Not sure? Ask AI what it is"}
        </Button>
      </div>
      {ai && (
        <div className="rounded-2xl border border-primary/30 bg-accent/50 p-3 text-sm">
          <div className="font-semibold">Likely: {ai.likely} <span className="text-xs font-normal text-muted-foreground">({ai.confidence} confidence)</span></div>
          <p className="text-muted-foreground">{ai.why}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">AI-sourced, please verify.</p>
        </div>
      )}
      {kind && (
        <div className="space-y-2 rounded-2xl bg-secondary p-3">
          <div className="text-[10px] font-bold uppercase text-primary">What to do</div>
          <Textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} className="bg-card" />
          <div className="flex items-center gap-2 text-sm">Repeat every <Input type="number" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="h-8 w-16 bg-card" /> days</div>
          {(ai?.prevention.length || info?.prevent) && (
            <div className="text-sm"><span className="font-semibold">Prevent it: </span>{ai?.prevention.length ? ai.prevention.join(" ") : info?.prevent}</div>
          )}
        </div>
      )}
      <Button className="h-12 w-full text-base" onClick={save} disabled={up.isPending || upload.isPending || !kind}>Log issue</Button>
    </Card>
  );
}

type Issue = NonNullable<ReturnType<typeof usePests>["data"]>[number];

function EditIssue({ issue, photoUrl, onClose }: { issue: Issue | null; photoUrl: (id: string | null) => string | null; onClose: () => void }) {
  return (
    <Dialog open={!!issue} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit issue</DialogTitle></DialogHeader>
        {issue && <EditIssueForm key={issue.id} issue={issue} photoUrl={photoUrl} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditIssueForm({ issue, photoUrl, onClose }: { issue: Issue; photoUrl: (id: string | null) => string | null; onClose: () => void }) {
  const plantings = usePlantings();
  const up = useUpsert("pest_logs");
  const upload = useUploadPhotos();
  const [pest, setPest] = useState(issue.pest);
  const [pid, setPid] = useState(issue.planting_id ?? "none");
  const [treatment, setTreatment] = useState(issue.treatment ?? "");
  const [repeat, setRepeat] = useState(issue.repeat_days ? String(issue.repeat_days) : "");
  const [notes, setNotes] = useState(issue.notes ?? "");
  const [seen, setSeen] = useState(issue.observed_on);
  const [resolved, setResolved] = useState(issue.resolved);
  const [photo, setPhoto] = useState<File | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const gen = useServerFn(generatePlantIcon);
  const [genBusy, setGenBusy] = useState(false);
  const pl = plantings.data?.find((x) => x.id === pid);
  async function generate() {
    if (pest.trim().length < 2) { toast.error("Name the issue first"); return; }
    setGenBusy(true);
    try {
      const { b64 } = await gen({ data: { subject: pest.trim() } });
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      setPhoto(new File([blob], "icon.png", { type: "image/png" }));
    } catch (e) { toast.error((e as Error).message); }
    setGenBusy(false);
  }
  const current = photo ? URL.createObjectURL(photo) : photoUrl(issue.photo_id);

  async function save() {
    if (!pest.trim()) { toast.error("Give the issue a name"); return; }
    let photo_id = issue.photo_id;
    try {
      if (photo) photo_id = (await upload.mutateAsync({ files: [photo], meta: { scope: pl ? "planting" : "garden", bed_id: pl?.bed_id ?? null, planting_id: pl?.id ?? null, caption: pest.trim(), taken_on: today() } }))[0] ?? photo_id;
    } catch (e) { toast.error((e as Error).message); return; }
    up.mutate({ id: issue.id, pest: pest.trim(), planting_id: pl?.id ?? null, bed_id: pl?.bed_id ?? issue.bed_id, treatment: treatment || null, repeat_days: repeat ? +repeat : null, notes: notes || null, observed_on: seen, resolved, photo_id } as never, {
      onSuccess: () => { toast.success("Issue updated"); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {current ? <img src={current} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted text-3xl">🐛</div>}
        <Button type="button" variant="outline" onClick={() => cam.current?.click()}><Camera className="mr-1 h-4 w-4" />{current ? "Replace photo" : "Add photo"}</Button>
        <Button type="button" variant="secondary" onClick={generate} disabled={genBusy}>{genBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}Generate icon</Button>
        <input ref={cam} type="file" accept="image/*" className="hidden" onChange={(e) => { setPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      </div>
      <div><Label>Issue</Label><Input value={pest} onChange={(e) => setPest(e.target.value)} /></div>
      <div><Label>Plant</Label>
        <Select value={pid} onValueChange={setPid}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">General</SelectItem>
            {(plantings.data ?? []).filter((p) => p.status === "growing" || p.id === issue.planting_id).map((p) => <SelectItem key={p.id} value={p.id}>{plantName(p)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Seen on</Label><Input type="date" value={seen} onChange={(e) => setSeen(e.target.value)} /></div>
      <div><Label>What to do</Label><Textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} /></div>
      <div className="flex items-center gap-2 text-sm">Repeat every <Input type="number" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="h-8 w-16" /> days</div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />Resolved</label>
      <Button className="w-full" onClick={save} disabled={up.isPending || upload.isPending}>{upload.isPending ? "Uploading photo..." : "Save changes"}</Button>
    </div>
  );
}
