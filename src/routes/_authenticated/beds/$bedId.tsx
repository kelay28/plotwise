import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { CustomIcon } from "@/components/CustomIcon";
import { PlantPicker } from "@/components/PlantPicker";
import { BedAdvisor } from "@/components/BedAdvisor";
import { VoicePlant } from "@/components/VoicePlant";
import { CropTray } from "@/components/CropTray";
import { PhotoLog } from "@/components/PhotoLog";
import { useCoarsePointer } from "@/hooks/use-coarse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type BedSection, type Planting, useBedNotes, useBeds, usePests, usePlantings, useRemove, useSections, useUpsert, useZone } from "@/lib/garden";
import { SECTION_KINDS, type SectionKind, sectionFill, sectionKind, sectionName } from "@/lib/sections";
import { aftercare, getCrop, PESTS, plantName } from "@/lib/crops";
import { cn } from "@/lib/utils";
import { fmt, fmtY, harvestInfo } from "@/lib/zones";

export const Route = createFileRoute("/_authenticated/beds/$bedId")({
  head: () => ({ meta: [{ title: "Bed details - Plotwise" }, { name: "description", content: "Plants, notes and soil care for this bed." }] }),
  component: BedPage,
});

const CELL = 44;
type Rect = { x: number; y: number; w: number; h: number };
const rectOf = (s: { x0: number; y0: number; x1: number; y1: number }): Rect => ({
  x: Math.min(s.x0, s.x1), y: Math.min(s.y0, s.y1), w: Math.abs(s.x1 - s.x0) + 1, h: Math.abs(s.y1 - s.y0) + 1,
});
const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const overlaps = (p: Planting, r: Rect) =>
  p.cell_x < r.x + r.w && p.cell_x + (p.cell_w ?? 1) > r.x && p.cell_y < r.y + r.h && p.cell_y + (p.cell_h ?? 1) > r.y;
const hitsSection = (s: BedSection, r: Rect) => s.x < r.x + r.w && s.x + s.w > r.x && s.y < r.y + r.h && s.y + s.h > r.y;
const HEAVY = new Set(["tomato", "corn", "pumpkin", "winter-squash", "summer-squash", "zucchini", "broccoli", "cauliflower", "cabbage", "brussels-sprouts", "kale", "collards", "watermelon", "cantaloupe"]);

function BedPage() {
  const { bedId } = Route.useParams();
  const navigate = useNavigate();
  const zone = useZone();
  const beds = useBeds();
  const plantings = usePlantings();
  const pests = usePests();
  const notes = useBedNotes(bedId);
  const upBed = useUpsert("beds");
  const rmBed = useRemove("beds");
  const upPlant = useUpsert("plantings");
  const rmPlant = useRemove("plantings");
  const upNote = useUpsert("bed_notes");
  const sections = useSections();
  const upSection = useUpsert("bed_sections");
  const rmSection = useRemove("bed_sections");
  const [mode, setMode] = useState<"plant" | "block">("plant");
  const [secDraft, setSecDraft] = useState<{ id?: string; rect: Rect; kind: SectionKind; label: string } | null>(null);
  const [cell, setCell] = useState<Rect | null>(null);
  const [mv, setMv] = useState<{ id: string; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);
  const [sel, setSel] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [form, setForm] = useState({ name: "", kind: "raised", w: 4, h: 8, sun: "full", sun_hours: "", soil_notes: "" });
  const [note, setNote] = useState({ kind: "performance", body: "" });
  const [brush, setBrush] = useState<string | null>(null);
  const coarse = useCoarsePointer();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => setAnchor(null), [brush, mode]);

  const bed = beds.data?.find((b) => b.id === bedId);
  useEffect(() => {
    if (bed) setForm({ name: bed.name, kind: bed.kind, w: bed.w, h: bed.h, sun: bed.sun, sun_hours: bed.sun_hours?.toString() ?? "", soil_notes: bed.soil_notes ?? "" });
  }, [bed?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (beds.isLoading) return <AppShell><p className="text-muted-foreground">Loading...</p></AppShell>;
  if (!bed) return <AppShell><p>Bed not found. <Link to="/map" className="text-primary">Back to map</Link></p></AppShell>;

  const mine = (plantings.data ?? []).filter((p) => p.bed_id === bedId);
  const growing = mine.filter((p) => p.status === "growing" || p.status === "harvested");
  const past = mine.filter((p) => p.status !== "growing" && p.status !== "harvested");
  const blocks = (sections.data ?? []).filter((s) => s.bed_id === bedId);
  const blockAt = (r: Rect) => blocks.find((s) => hitsSection(s, r));
  // A planting can't share squares with another planting or a blocked-off section.
  const taken = (r: Rect, exceptId?: string) => growing.some((o) => o.id !== exceptId && overlaps(o, r)) || !!blockAt(r);
  // Find a spot for a resized plant that still covers its current square, growing left/up when it sits on an edge.
  const fitSpot = (p: Planting, w: number, h: number) => {
    for (let y = p.cell_y; y >= p.cell_y - h + 1; y--)
      for (let x = p.cell_x; x >= p.cell_x - w + 1; x--) {
        if (x < 0 || y < 0 || x + w > bed.w || y + h > bed.h) continue;
        if (!taken({ x, y, w, h }, p.id)) return { x, y };
      }
    return null;
  };
  // Nearest open spot for a copy, scanning outward from the original.
  const copySpot = (p: Planting) => {
    const w = p.cell_w ?? 1, h = p.cell_h ?? 1;
    const spots: { x: number; y: number; d: number }[] = [];
    for (let y = 0; y + h <= bed.h; y++) for (let x = 0; x + w <= bed.w; x++)
      if (!taken({ x, y, w, h })) spots.push({ x, y, d: Math.abs(x - p.cell_x) + Math.abs(y - p.cell_y) });
    return spots.sort((a, b) => a.d - b.d)[0] ?? null;
  };
  const current = cell ? growing.find((p) => p.cell_x === cell.x && p.cell_y === cell.y) : undefined;
  const bedPests = (pests.data ?? []).filter((p) => p.bed_id === bedId && !p.resolved);

  const lastFeed = (notes.data ?? []).find((n) => n.kind === "compost" || n.kind === "fertilizer");
  const daysSinceFeed = lastFeed ? (Date.now() - new Date(lastFeed.noted_on).getTime()) / 86400000 : Infinity;
  const heavy = [...new Set(growing.filter((p) => HEAVY.has(p.crop_slug)).map((p) => getCrop(p.crop_slug).name))];
  const sunMismatch = [...new Set(growing.filter((p) => bed.sun !== "full" && getCrop(p.crop_slug).sun === "full").map((p) => getCrop(p.crop_slug).name))];

  return (
    <AppShell title={bed.name} subtitle={`${bed.w} x ${bed.h} ft · ${bed.kind} · ${bed.sun} sun`}
      actions={<Button variant="outline" size="icon" className="rounded-xl" asChild><Link to="/map" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>Planting grid · 1 sq = 1 ft</SectionLabel>
              {bedPests.length > 0 && <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">Pest alert</span>}
            </div>
            <div className="mb-2 inline-flex rounded-xl bg-muted p-1 text-xs font-semibold" role="tablist" aria-label="Grid mode">
              {([["plant", "🌱 Plant"], ["block", "🚧 Block off area"]] as const).map(([m, label]) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                  className={cn("rounded-lg px-3 py-1.5 transition", mode === m ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{label}</button>
              ))}
            </div>
            {mode === "plant" && <CropTray value={brush} onChange={setBrush} recent={[...new Set([...mine].reverse().map((p) => p.crop_slug))].slice(0, 6)} />}
            <p className="mb-2 text-xs text-muted-foreground">{mode === "block" ? (coarse ? (anchor ? "Tap the opposite corner of the area to block off." : "Tap a corner of the area to block off (compost, amending, path...).") : "Drag across the squares to block off (compost, amending, path...). Tap a section to rename or remove it.") : brush ? (coarse ? (anchor ? "Tap the opposite corner to fill a rectangle, or the same square again for just one." : `Tap a square to start planting ${getCrop(brush).name}.`) : `Drag across the squares to fill with ${getCrop(brush).name}. Release to plant.`) : "Pick a crop above and drag over squares to plant it, or tap a square to choose. Drag a plant to move it."}</p>
            <div className="overflow-auto">
              <div
                className={cn("grid select-none gap-1", !coarse && "touch-none")}
                style={{ gridTemplateColumns: `repeat(${bed.w}, ${CELL}px)`, gridTemplateRows: `repeat(${bed.h}, ${CELL}px)` }}
                onPointerMove={(e) => {
                  if (!sel && !mv) return;
                  const el = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset['x'] != null) as HTMLElement | undefined;
                  const x = el?.dataset['x'], y = el?.dataset['y'];
                  if (x == null || y == null) return;
                  if (mv) {
                    const p = growing.find((g) => g.id === mv.id)!;
                    const nx = Math.min(bed.w - (p.cell_w ?? 1), Math.max(0, +x - mv.dx));
                    const ny = Math.min(bed.h - (p.cell_h ?? 1), Math.max(0, +y - mv.dy));
                    if (nx !== mv.x || ny !== mv.y) setMv({ ...mv, x: nx, y: ny, moved: true });
                    return;
                  }
                  if (sel) setSel({ ...sel, x1: +x, y1: +y });
                }}
                onPointerUp={() => {
                  if (mv) {
                    const p = growing.find((g) => g.id === mv.id)!;
                    setMv(null);
                    if (!mv.moved) { setCell({ x: p.cell_x, y: p.cell_y, w: p.cell_w ?? 1, h: p.cell_h ?? 1 }); return; }
                    if (mv.x === p.cell_x && mv.y === p.cell_y) return;
                    const r = { x: mv.x, y: mv.y, w: p.cell_w ?? 1, h: p.cell_h ?? 1 };
                    if (growing.some((o) => o.id !== p.id && overlaps(o, r))) { toast.error("Another plant is already there"); return; }
                    const blk = blockAt(r);
                    if (blk) { toast.error(`That spot is blocked off (${sectionName(blk)})`); return; }
                    upPlant.mutate({ id: p.id, cell_x: mv.x, cell_y: mv.y } as never);
                    return;
                  }
                  if (!sel) return;
                  let r = rectOf(sel);
                  setSel(null);
                  if (coarse && (brush || mode === "block")) {
                    if (!anchor) { setAnchor({ x: r.x, y: r.y }); return; }
                    r = rectOf({ x0: anchor.x, y0: anchor.y, x1: r.x, y1: r.y });
                    setAnchor(null);
                  }
                  if (growing.some((p) => overlaps(p, r))) { toast.error("That area overlaps a plant already there"); return; }
                  const blk = blockAt(r);
                  if (blk) { toast.error(`That area overlaps a blocked-off section (${sectionName(blk)})`); return; }
                  if (mode === "block") { setSecDraft({ rect: r, kind: "compost", label: "" }); return; }
                  if (brush) {
                    upPlant.mutate({ crop_slug: brush, bed_id: bedId, cell_x: r.x, cell_y: r.y, cell_w: r.w, cell_h: r.h, method: "transplant", stage: "seedling" } as never, {
                      onSuccess: () => { toast.success(`Planted ${getCrop(brush).name}`, { action: { label: "Add details", onClick: () => setCell(r) } }); },
                      onError: (e) => toast.error(e.message),
                    });
                    return;
                  }
                  setCell(r);
                }}
                onPointerLeave={() => { setSel(null); setMv(null); }}
                onPointerCancel={() => { setSel(null); setMv(null); }}
              >
                {Array.from({ length: bed.h }).flatMap((_, y) =>
                  Array.from({ length: bed.w }).map((_, x) => {
                    const inSel = (sel && inRect(x, y, rectOf(sel))) || (anchor?.x === x && anchor?.y === y);
                    const bad = inSel && !!sel && taken(rectOf(sel));
                    return (
                      <button key={`${x}-${y}`} data-x={x} data-y={y}
                        onPointerDown={(e) => { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); setSel({ x0: x, y0: y, x1: x, y1: y }); }}
                        className={cn("flex items-center justify-center rounded-lg border-2 transition", bad ? "border-destructive bg-destructive/20" : inSel ? (mode === "block" ? "border-ink bg-ink/15" : "border-primary bg-primary/20") : "border-accent bg-secondary/60 hover:border-primary")}
                        style={{ gridColumn: x + 1, gridRow: y + 1 }} aria-label="Empty square">
                        <span className="pointer-events-none text-muted-foreground/40">+</span>
                      </button>
                    );
                  }),
                )}
                {blocks.map((b) => {
                  const k = sectionKind(b.kind);
                  return (
                    <button key={b.id}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setSecDraft({ id: b.id, rect: { x: b.x, y: b.y, w: b.w, h: b.h }, kind: (b.kind in SECTION_KINDS ? b.kind : "other") as SectionKind, label: b.label ?? "" })}
                      className="group/tip relative z-[5] flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-2 border-dashed p-1 text-center transition hover:brightness-95"
                      style={{ gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, background: sectionFill(b.kind), borderColor: `color-mix(in oklab, ${k.color} 60%, transparent)` }}
                      aria-label={`Blocked off: ${sectionName(b)}`}>
                      <span className="pointer-events-none text-lg leading-none">{k.emoji}</span>
                      {(b.w > 1 || b.h > 1) && <span className="pointer-events-none line-clamp-2 rounded bg-card/85 px-1 text-[10px] font-bold leading-tight text-foreground">{sectionName(b)}</span>}
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground shadow group-hover/tip:block">{sectionName(b)}</span>
                    </button>
                  );
                })}
                {growing.map((p) => {
                  const w = p.cell_w ?? 1, h = p.cell_h ?? 1;
                  const moving = mv?.id === p.id;
                  const px = moving ? mv.x : p.cell_x, py = moving ? mv.y : p.cell_y;
                  return (
                    <button key={p.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                        const el = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset['x'] != null) as HTMLElement | undefined;
                        const gx = el ? +el.dataset['x']! : p.cell_x, gy = el ? +el.dataset['y']! : p.cell_y;
                        setMv({ id: p.id, x: p.cell_x, y: p.cell_y, dx: gx - p.cell_x, dy: gy - p.cell_y, moved: false });
                      }}
                      className={cn("group/tip relative z-10 flex cursor-grab items-center justify-center rounded-lg border-2 bg-card transition hover:border-primary", moving && mv.moved && "pointer-events-none z-20 scale-105 cursor-grabbing shadow-lg")}
                      style={{ gridColumn: `${px + 1} / span ${w}`, gridRow: `${py + 1} / span ${h}`, borderColor: `color-mix(in oklab, ${p.color || getCrop(p.crop_slug).color} 45%, transparent)` }}
                      aria-label={getCrop(p.crop_slug).name}>
                      <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={Math.min(w, h) * CELL * 0.75 + (Math.min(w, h) - 1) * 4} className={p.status === "harvested" ? "opacity-50" : undefined} />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground shadow group-hover/tip:block">{`${plantName(p)}${p.status === "harvested" ? " · harvested" : ""}`}</span>
                      {p.status === "harvested" && <span className="absolute right-0.5 top-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <VoicePlant bedId={bed.id} />
          <BedAdvisor bedId={bed.id} />

          <PhotoLog bedId={bed.id} title="Bed photos" />

          <Card>
            <SectionLabel>Soil & care suggestions</SectionLabel>
            <ul className="space-y-2 text-sm">
              {daysSinceFeed > 180 && <li>🪱 No compost or fertilizer logged in the last 6 months. Top-dress with 1-2 in of compost before the next planting.</li>}
              {heavy.length > 0 && <li>🍽️ Heavy feeders here ({heavy.join(", ")}). Side-dress with compost or a balanced organic fertilizer every 4-6 weeks.</li>}
              {sunMismatch.length > 0 && <li>☀️ {sunMismatch.join(", ")} want full sun, but this bed is marked {bed.sun} sun. Expect slower growth or move next season.</li>}
              {growing.some((p) => ["bush-beans", "pole-beans", "peas"].includes(p.crop_slug)) && <li>🫘 Legumes add nitrogen - a good spot for leafy greens next season.</li>}
              {daysSinceFeed <= 180 && heavy.length === 0 && sunMismatch.length === 0 && <li className="text-muted-foreground">Looking good. Log compost and harvest notes to get better suggestions.</li>}
            </ul>
          </Card>

          <Card>
            <SectionLabel>Bed notes & performance</SectionLabel>
            <div className="flex gap-2">
              <Select value={note.kind} onValueChange={(kind) => setNote({ ...note, kind })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance</SelectItem><SelectItem value="compost">Compost added</SelectItem>
                  <SelectItem value="fertilizer">Fertilizer</SelectItem><SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
              <Input value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} placeholder="e.g. Kale did great, little sun after 3pm" />
              <Button onClick={() => note.body.trim() && upNote.mutate({ bed_id: bedId, kind: note.kind, body: note.body.trim() }, { onSuccess: () => setNote({ ...note, body: "" }) })}>Add</Button>
            </div>
            <ul className="mt-3 space-y-2">
              {(notes.data ?? []).map((n) => (
                <li key={n.id} className="rounded-xl bg-muted p-2 text-sm"><span className="mr-2 text-xs font-bold uppercase text-primary">{n.kind}</span>{n.body}<span className="ml-2 text-xs text-muted-foreground">{fmtY(new Date(n.noted_on + "T12:00"))}</span></li>
              ))}
            </ul>
            {past.length > 0 && (
              <>
                <h4 className="mb-2 mt-4 text-xs font-bold uppercase text-muted-foreground">Past plantings</h4>
                <div className="flex flex-wrap gap-2">
                  {past.map((p) => <span key={p.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"><PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={18} />{p.variety ?? getCrop(p.crop_slug).name} · {p.status}</span>)}
                </div>
              </>
            )}
          </Card>
        </div>

        <Card className="h-fit space-y-3">
          <SectionLabel>Bed settings</SectionLabel>
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Type</Label>
            <Select value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="raised">Raised bed</SelectItem><SelectItem value="in-ground">In-ground</SelectItem><SelectItem value="container">Pot / container</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Width ft</Label><Input type="number" min={1} value={form.w || ""} onChange={(e) => setForm({ ...form, w: Math.min(100, +e.target.value) })} onBlur={() => setForm({ ...form, w: Math.max(1, form.w) })} /></div>
            <div><Label>Length ft</Label><Input type="number" min={1} value={form.h || ""} onChange={(e) => setForm({ ...form, h: Math.min(100, +e.target.value) })} onBlur={() => setForm({ ...form, h: Math.max(1, form.h) })} /></div>
            <div><Label>Sun</Label>
              <Select value={form.sun} onValueChange={(sun) => setForm({ ...form, sun })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="full">Full</SelectItem><SelectItem value="part">Part</SelectItem><SelectItem value="shade">Shade</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Sun hrs/day</Label><Input type="number" value={form.sun_hours} onChange={(e) => setForm({ ...form, sun_hours: e.target.value })} /></div>
          </div>
          <div><Label>Soil notes</Label><Textarea value={form.soil_notes} onChange={(e) => setForm({ ...form, soil_notes: e.target.value })} placeholder="Clay, pH 6.5, drains slowly..." /></div>
          <Button className="w-full" onClick={() => upBed.mutate({ id: bedId, name: form.name, kind: form.kind, w: form.w, h: form.h, sun: form.sun, sun_hours: form.sun_hours ? +form.sun_hours : null, soil_notes: form.soil_notes || null } as never, { onSuccess: () => toast.success("Saved") })}>Save</Button>
          <Button variant="ghost" className="w-full text-destructive" onClick={() => confirm("Delete this bed and its plants?") && rmBed.mutate(bedId, { onSuccess: () => navigate({ to: "/map" }) })}>
            <Trash2 className="mr-1 h-4 w-4" />Delete bed
          </Button>
        </Card>
      </div>

      <Sheet open={!!secDraft} onOpenChange={(o) => !o && setSecDraft(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader><SheetTitle>{secDraft?.id ? "Blocked-off section" : `Block off ${secDraft ? `${secDraft.rect.w} x ${secDraft.rect.h} ft` : ""}`}</SheetTitle></SheetHeader>
          {secDraft && (
            <div className="mx-auto max-w-lg space-y-4 p-4">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">What's here</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SECTION_KINDS) as SectionKind[]).map((k) => (
                    <button key={k} onClick={() => setSecDraft({ ...secDraft, kind: k })}
                      className={cn("flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition", secDraft.kind === k ? "border-primary bg-accent" : "border-transparent bg-muted hover:border-primary")}>
                      <span>{SECTION_KINDS[k].emoji}</span>{SECTION_KINDS[k].name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="sec-label">Label (optional)</Label>
                <Input id="sec-label" value={secDraft.label} maxLength={60} placeholder={`e.g. ${secDraft.kind === "amending" ? "Adding gypsum until May" : secDraft.kind === "compost" ? "Hot compost pile" : SECTION_KINDS[secDraft.kind].name}`}
                  onChange={(e) => setSecDraft({ ...secDraft, label: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">Plants can't be placed here until you remove the section. {secDraft.rect.w * secDraft.rect.h} sq ft.</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={upSection.isPending} onClick={() => {
                  const { id, rect, kind, label } = secDraft;
                  upSection.mutate({ ...(id ? { id } : {}), bed_id: bedId, x: rect.x, y: rect.y, w: rect.w, h: rect.h, kind, label: label.trim() || null } as never, {
                    onSuccess: () => { toast.success(id ? "Section updated" : `Blocked off for ${label.trim() || SECTION_KINDS[kind].name}`); setSecDraft(null); },
                    onError: (e) => toast.error(e.message),
                  });
                }}>{secDraft.id ? "Save" : "Block off"}</Button>
                {secDraft.id && (
                  <Button variant="ghost" className="text-destructive" onClick={() => rmSection.mutate(secDraft.id!, { onSuccess: () => { toast.success("Section removed - space is open for planting"); setSecDraft(null); } })}>
                    <Trash2 className="mr-1 h-4 w-4" />Remove section
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader><SheetTitle>{current ? "Plant details" : cell && cell.w * cell.h > 1 ? `Add a plant (${cell.w} x ${cell.h} ft area)` : "Add a plant"}</SheetTitle></SheetHeader>
          <div className="mx-auto max-w-lg p-4">
            {current ? (
              <PlantDetails p={current} zone={zone}
                onPatch={(patch) => upPlant.mutate({ id: current.id, ...patch } as never, { onSuccess: () => toast.success("Saved") })}
                onStatus={(status) => upPlant.mutate({ id: current.id, status } as never, { onSuccess: () => { toast.success(`Marked ${status}`); setCell(null); } })}
                onRemove={() => upPlant.mutate({ id: current.id, status: "removed" } as never, { onSuccess: () => { toast.success("Removed from bed"); setCell(null); } })}
                onIcon={(icon) => upPlant.mutate({ id: current.id, icon } as never)}
                onDate={(d, m) => upPlant.mutate({ id: current.id, planted_on: d, method: m } as never)}
                onDuplicate={() => {
                  const at = copySpot(current);
                  if (!at) { toast.error("No open space in this bed for a copy"); return; }
                  const { id: _i, created_at: _c, user_id: _u, ...rest } = current;
                  upPlant.mutate({ ...rest, cell_x: at.x, cell_y: at.y } as never, { onSuccess: () => { toast.success("Duplicated - same dates and details"); setCell({ x: at.x, y: at.y, w: current.cell_w ?? 1, h: current.cell_h ?? 1 }); } });
                }}
                canSize={(w, h) => !!fitSpot(current, w, h)}
                onSize={(w, h) => { const at = fitSpot(current, w, h)!; upPlant.mutate({ id: current.id, cell_x: at.x, cell_y: at.y, cell_w: w, cell_h: h } as never, { onSuccess: () => toast.success(`Now takes ${w * h} square${w * h > 1 ? "s" : ""}`) }); }}
                onPest={() => navigate({ to: "/pests", search: { planting: current.id } })} />
            ) : (
              <PlantPicker saving={upPlant.isPending} onSave={(c) => cell && upPlant.mutate({ ...c, bed_id: bedId, cell_x: cell.x, cell_y: cell.y, cell_w: cell.w, cell_h: cell.h }, { onSuccess: () => { toast.success("Planted"); setCell(null); }, onError: (e) => toast.error(e.message) })} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function PlantDetails({ p, zone, onPatch, onDuplicate, onStatus, onRemove, onPest, onIcon, onDate, canSize, onSize }: { p: Planting; onDuplicate: () => void; onPatch: (patch: Partial<Planting>) => void; onDate: (d: string | null, method: string) => void; zone: string; onStatus: (s: string) => void; onRemove: () => void; onPest: () => void; onIcon: (icon: string | null) => void; canSize: (w: number, h: number) => boolean; onSize: (w: number, h: number) => void }) {
  const crop = getCrop(p.crop_slug);
  const h = harvestInfo(p, zone);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={56} />
        <div>
          <input key={p.id + (p.variety ?? "")} defaultValue={plantName(p)} aria-label="Plant name"
            className="w-full rounded-md bg-transparent text-xl font-bold outline-none hover:bg-muted focus:bg-muted focus:px-1"
            onBlur={(e) => { const v = e.target.value.trim(); if (v !== plantName(p)) onPatch({ variety: !v || v.toLowerCase() === crop.name.toLowerCase() ? null : v }); }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          <p className="text-sm text-muted-foreground">{p.method === "seed" ? "Seeded" : "Planted"} {fmt(h.planted)}{h.estimatedDate && " (estimated)"} · harvest ~{fmt(h.harvest)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Planted on</div>
          <Input type="date" className="h-9 w-40" value={p.planted_on ?? ""} onChange={(e) => onDate(e.target.value || null, p.method)} />
        </div>
        <div className="flex gap-1">
          {(["transplant", "seed"] as const).map((m) => (
            <button key={m} onClick={() => onDate(p.planted_on, m)} className={cn("h-9 rounded-lg border-2 px-3 text-xs font-semibold", p.method === m ? "border-primary bg-accent" : "border-transparent bg-muted hover:border-primary")}>{m === "seed" ? "From seed" : "Transplant"}</button>
          ))}
        </div>
        {p.planted_on && <Button size="sm" variant="ghost" onClick={() => onDate(null, p.method)}>Clear (use 7B estimate)</Button>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Expected harvest</div>
          <Input key={`h${h.harvest.getTime()}`} type="date" className="h-9 w-40" defaultValue={iso(h.harvest)}
            onBlur={(e) => { if (!e.target.value || e.target.value === iso(h.harvest)) return; const d = Math.round((new Date(e.target.value + "T12:00").getTime() - h.planted.getTime()) / 86400000); if (d > 0) onPatch({ days_to_maturity: d }); }} />
        </div>
        {p.days_to_maturity != null && <Button size="sm" variant="ghost" onClick={() => onPatch({ days_to_maturity: null })}>Reset to typical</Button>}
      </div>
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Space it takes</div>
        <div className="flex flex-wrap items-center gap-3">
          {(["w", "h"] as const).map((dim) => {
            const cw = p.cell_w ?? 1, ch = p.cell_h ?? 1;
            const cur = dim === "w" ? cw : ch;
            const set = (v: number) => dim === "w" ? onSize(v, ch) : onSize(cw, v);
            const can = (v: number) => v >= 1 && (dim === "w" ? canSize(v, ch) : canSize(cw, v));
            return (
              <div key={dim} className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs font-semibold">
                <span className="px-1 text-muted-foreground">{dim === "w" ? "Wide" : "Long"}</span>
                <button disabled={!can(cur - 1)} onClick={() => set(cur - 1)} className="h-7 w-7 rounded-md bg-card disabled:opacity-40" aria-label={`Decrease ${dim === "w" ? "width" : "length"}`}>−</button>
                <span className="w-8 text-center">{cur} ft</span>
                <button disabled={!can(cur + 1)} onClick={() => set(cur + 1)} className="h-7 w-7 rounded-md bg-card disabled:opacity-40" aria-label={`Increase ${dim === "w" ? "width" : "length"}`} title={can(cur + 1) ? "" : "Not enough room"}>+</button>
              </div>
            );
          })}
          <span className="text-xs text-muted-foreground">{(p.cell_w ?? 1) * (p.cell_h ?? 1)} sq ft · great for a whole row as one entry</span>
        </div>
      </div>
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Picture</div>
        <div className="flex flex-wrap gap-1">
          {ICONS.map((e) => (
            <button key={e} onClick={() => onIcon(e === crop.emoji ? null : e)} className={cn("flex h-9 w-9 items-center justify-center rounded-lg border-2 text-xl transition hover:border-primary", (p.icon || crop.emoji) === e ? "border-primary bg-accent" : "border-transparent bg-muted")}>{e}</button>
          ))}
        </div>
        <CustomIcon defaultSubject={plantName(p)} current={p.icon} onPick={(u) => onIcon(u)} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${h.progress * 100}%` }} /></div>
      <p className="text-sm font-semibold">{h.daysLeft <= 0 ? "Ready to harvest" : `${h.daysLeft} days to harvest`} ({h.days} days to maturity)</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Info k="Sun" v={crop.sunHours} /><Info k="Water" v={crop.water} />
      </div>
      <Info k="After planting" v={aftercare(p.crop_slug)} />
      <PhotoLog bedId={p.bed_id} plantingId={p.id} title="Photos of this plant" compact />
      {crop.feeding && <Info k="Feeding" v={crop.feeding} />}
      {crop.pruning && <Info k="Pruning" v={crop.pruning} />}
      {crop.pests.length > 0 && <Info k="Watch for" v={crop.pests.map((k) => PESTS[k].name).join(", ")} />}
      <div className="flex flex-wrap gap-2">
        {p.status === "harvested"
          ? <Button variant="outline" onClick={() => onStatus("growing")}>Undo harvest</Button>
          : <Button onClick={() => onStatus("harvested")}>Harvested</Button>}
        <Button variant="outline" onClick={onDuplicate}>Duplicate</Button>
        <Button variant="outline" onClick={onPest}>🐛 Log pest</Button>
        <Button variant="outline" onClick={() => onStatus("failed")}>Didn't make it</Button>
        <Button variant="ghost" className="text-destructive" onClick={onRemove}>Remove</Button>
        <Button variant="link" asChild><Link to="/library/$slug" params={{ slug: p.crop_slug }}>Full guide</Link></Button>
      </div>
    </div>
  );
}

const ICONS = ["🌱","🌿","🍃","🌳","🌲","🪴","🌸","🌻","🌷","🌼","🍅","🌶️","🫑","🥕","🥬","🥦","🧅","🧄","🥔","🍠","🌽","🥒","🎃","🍆","🫛","🫘","🍓","🫐","🍇","🍈","🍉","🍑","🍒","🍐","🍎","🍋","🍊","🥝","🍌","🌰","🥜","🍄","🟣","🟢"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const Info = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded-xl bg-muted p-2"><div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div><div className="text-sm">{v}</div></div>
);
