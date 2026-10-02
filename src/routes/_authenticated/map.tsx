import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCoarsePointer } from "@/hooks/use-coarse";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, Maximize2, Move, Plus, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppShell, Card } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { VoicePlant } from "@/components/VoicePlant";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Bed, type YardFeature, useFeatures, useRemove, loadSampleGarden, useProfile, useBeds, usePests, usePlantings, useSections, useUpsert, useZone } from "@/lib/garden";
import { sectionFill, sectionKind, sectionName } from "@/lib/sections";
import { CustomIcon } from "@/components/CustomIcon";
const FEATURE_ICONS = ["🌳", "🌲", "🌴", "🍎", "🍑", "🍒", "🌸", "🔥", "🪵", "🪨", "⛲", "🚰", "🛖", "🏠", "🏡", "🪑", "⛱️", "🐔", "🐝", "🐶", "♻️", "🧺", "🪣", "🚗", "📍"];
import { fmt, harvestInfo, harvestUntil } from "@/lib/zones";
import { getCrop, plantName } from "@/lib/crops";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/map")({
  validateSearch: z.object({ add: z.boolean().optional(), feature: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Yard map - Plotwise" }, { name: "description", content: "Your garden beds and plants on a grid." }] }),
  component: MapPage,
});

const FT = 22;

export const FEATURE_KINDS: Record<string, { label: string; emoji: string; cls: string }> = {
  fence: { label: "Fence", emoji: "", cls: "feat-fence" },
  wall: { label: "Wall", emoji: "", cls: "feat-wall" },
  path: { label: "Path", emoji: "", cls: "feat-path" },
  patio: { label: "Patio / deck", emoji: "", cls: "feat-patio" },
  firepit: { label: "Fire pit", emoji: "🔥", cls: "feat-firepit" },
  shed: { label: "Shed / building", emoji: "🛖", cls: "feat-shed" },
  tree: { label: "Tree", emoji: "🌳", cls: "feat-tree" },
  water: { label: "Water / spigot", emoji: "🚰", cls: "feat-water" },
  compost: { label: "Compost", emoji: "♻️", cls: "feat-compost" },
  other: { label: "Other", emoji: "📍", cls: "feat-other" },
};
const FEATURE_DEFAULTS: Record<string, { w: number; h: number }> = {
  fence: { w: 20, h: 1 }, wall: { w: 12, h: 1 }, path: { w: 3, h: 12 }, patio: { w: 10, h: 10 }, firepit: { w: 4, h: 4 },
  shed: { w: 8, h: 6 }, tree: { w: 6, h: 6 }, water: { w: 1, h: 1 }, compost: { w: 3, h: 3 }, other: { w: 2, h: 2 },
};

function MapPage() {
  const { add, feature } = Route.useSearch();
  const features = useFeatures();
  const upFeat = useUpsert("yard_features");
  const [editFeat, setEditFeat] = useState<YardFeature | null>(null);
  const navigate = useNavigate();
  const beds = useBeds();
  const plantings = usePlantings();
  const sections = useSections();
  const pests = usePests();
  const zone = useZone();
  const upsert = useUpsert("beds");
  const qc = useQueryClient();
  const [view, setView] = useState<"compact" | "true">("true");
  const [edit, setEdit] = useState(false);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ t: "bed" | "feat"; id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const bedRz = useRef<{ t: "bed" | "feat"; id: string; sx: number; sy: number; w: number; h: number; minW: number; minH: number } | null>(null);

  const list = beds.data ?? [];
  const feats = view === "true" ? features.data ?? [] : [];
  const growing = (plantings.data ?? []).filter((p) => p.status === "growing" || p.status === "harvested");
  const activePestBeds = new Set((pests.data ?? []).filter((p) => !p.resolved).map((p) => p.bed_id));

  const at = (b: Bed) => pos[b.id] ?? (view === "compact" ? { x: b.compact_x, y: b.compact_y } : { x: b.x, y: b.y });
  const saved = (b: Bed) => (view === "compact" ? { x: b.compact_x, y: b.compact_y } : { x: b.x, y: b.y });
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data: profile } = useProfile();
  const upProfile = useUpsert("profiles");
  const [yardDraft, setYardDraft] = useState<{ w: number; h: number } | null>(null);
  const resize = useRef<{ sx: number; sy: number; w: number; h: number } | null>(null);
  // Smallest yard that still holds every bed (labels sit 1 ft below a bed).
  const minW = Math.max(4, ...list.map((b) => saved(b).x + b.w + (view === "compact" ? 1 : 0)), ...feats.map((f) => f.x + f.w));
  const minH = Math.max(4, ...list.map((b) => saved(b).y + b.h + 1), ...feats.map((f) => f.y + f.h));
  const savedYard = view === "true" && profile?.yard_w && profile?.yard_h ? { w: profile.yard_w, h: profile.yard_h } : { w: minW, h: minH };
  const yard = yardDraft ?? savedYard;
  const maxX = Math.max(minW, yard.w);
  const maxY = Math.max(minH, yard.h);
  const saveYard = (w: number, h: number) => {
    const nw = Math.max(minW, w), nh = Math.max(minH, h);
    upProfile.mutate({ id: profile!.id, yard_w: nw, yard_h: nh } as never, { onSettled: () => { setYardDraft(null); qc.invalidateQueries({ queryKey: ["profile"] }); } });
  };

  // At a glance: keep at least 1 ft of space around every bed (labels sit in the row below).
  const spaced = (() => {
    const out: Record<string, { x: number; y: number }> = {};
    if (view !== "compact") return out;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const hit = (x: number, y: number, w: number, h: number) =>
      placed.some((r) => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y);
    const order = [...list].sort((a, b) => (drag.current?.id === a.id ? -1 : drag.current?.id === b.id ? 1 : 0));
    for (const b of order) {
      const want = pos[b.id] ?? { x: b.compact_x, y: b.compact_y };
      const sz = sizes[b.id] ?? { w: b.w, h: b.h };
      const h = sz.h + 1;
      let { x, y } = want;
      for (let i = 0; hit(x, y, sz.w, h) && i < 400; i++) { x++; if (x > Math.max(40, want.x + 40)) { x = 0; y++; } }
      out[b.id] = { x, y };
      placed.push({ x, y, w: sz.w, h });
    }
    return out;
  })();
  const gridW = Math.max(maxX, ...list.map((b) => (spaced[b.id]?.x ?? 0) + (sizes[b.id]?.w ?? b.w) + 1));
  const gridH = Math.max(maxY, ...list.map((b) => (spaced[b.id]?.y ?? 0) + (sizes[b.id]?.h ?? b.h) + 2));
  const shown = (b: Bed) => spaced[b.id] ?? at(b);
  const featAt = (f: YardFeature) => pos[f.id] ?? { x: f.x, y: f.y };
  function onDown(e: React.PointerEvent, b: Bed | YardFeature, t: "bed" | "feat" = "bed") {
    if (!edit) return;
    e.preventDefault();
    const p = t === "bed" ? at(b as Bed) : featAt(b as YardFeature);
    drag.current = { t, id: b.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
  }
  function onMove(e: PointerEvent) {
    const br = bedRz.current;
    if (br) {
      const w = Math.max(br.minW, Math.round(br.w + (e.clientX - br.sx) / FT));
      const h = Math.max(br.minH, Math.round(br.h + (e.clientY - br.sy) / FT));
      setSizes((s) => ({ ...s, [br.id]: { w, h } }));
      return;
    }
    const rz = resize.current;
    if (rz) {
      setYardDraft({ w: Math.max(minW, Math.round(rz.w + (e.clientX - rz.sx) / FT)), h: Math.max(minH, Math.round(rz.h + (e.clientY - rz.sy) / FT)) });
      return;
    }
    const d = drag.current;
    if (!d) return;
    const b = d.t === "bed" ? list.find((x) => x.id === d.id) : feats.find((x) => x.id === d.id);
    const x = Math.min(maxX - (b?.w ?? 1), Math.max(0, Math.round(d.ox + (e.clientX - d.sx) / FT)));
    const y = Math.min(maxY - (b?.h ?? 1) - (d.t === "bed" ? 1 : 0), Math.max(0, Math.round(d.oy + (e.clientY - d.sy) / FT)));
    setPos((s) => ({ ...s, [d.id]: { x, y } }));
  }
  function onUp() {
    const br = bedRz.current;
    if (br) {
      bedRz.current = null;
      const sz = sizes[br.id];
      if (sz && (sz.w !== br.w || sz.h !== br.h)) {
        (br.t === "bed" ? upsert : upFeat).mutate({ id: br.id, w: sz.w, h: sz.h } as never, {
          onSuccess: () => toast.success(`Resized to ${sz.w} x ${sz.h} ft`),
          onSettled: () => setSizes((s) => { const n = { ...s }; delete n[br.id]; return n; }),
        });
      }
      return;
    }
    if (resize.current) { resize.current = null; if (yardDraft) saveYard(yardDraft.w, yardDraft.h); return; }
    const d = drag.current;
    drag.current = null;
    if (!d || !pos[d.id]) return;
    const p = pos[d.id]!;
    if (d.t === "feat") {
      upFeat.mutate({ id: d.id, x: p.x, y: p.y } as never, { onSettled: () => setPos((s) => { const n = { ...s }; delete n[d.id]; return n; }) });
      return;
    }
    const sp = spaced[d.id] ?? p;
    upsert.mutate(view === "compact" ? { id: d.id, compact_x: sp.x, compact_y: sp.y } as never : { id: d.id, x: p.x, y: p.y } as never, {
      onSettled: () => setPos((s) => { const n = { ...s }; delete n[d.id]; return n; }),
    });
  }
  useEffect(() => setPos({}), [view]);
  // Phones: start in the at-a-glance view so every bed fits.
  useEffect(() => { if (window.matchMedia("(max-width: 767px)").matches && !add && !feature) setView("compact"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Track drags on the whole window so resizing/moving doesn't stall when the pointer leaves the grid.
  const handlers = useRef({ onMove, onUp });
  handlers.current = { onMove, onUp };
  useEffect(() => {
    const mv = (e: PointerEvent) => handlers.current.onMove(e);
    const up = () => handlers.current.onUp();
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);
  const startRz = (e: React.PointerEvent, t: "bed" | "feat", id: string, w: number, h: number, minW = 1, minH = 1) => {
    e.preventDefault(); e.stopPropagation();
    bedRz.current = { t, id, sx: e.clientX, sy: e.clientY, w, h, minW, minH };
    setSizes((s) => ({ ...s, [id]: { w, h } }));
  };

  // Placement mode: drop a new bed/feature straight onto the map, then name it.
  const [placing, setPlacing] = useState<{ t: "bed" | "feat"; kind: string } | null>(null);
  const coarse = useCoarsePointer();
  const [full, setFull] = useState(false);
  const preview = coarse && !full && !placing;
  useEffect(() => { if (coarse && placing) setFull(true); }, [coarse, placing]);
  useEffect(() => { if (!full) return; const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, [full]);
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number; name: string; kind: string } | null>(null);
  const [forceGrid, setForceGrid] = useState(false);
  const placeDrag = useRef<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const defSize = placing?.t === "feat" ? FEATURE_DEFAULTS[placing.kind] ?? { w: 2, h: 2 } : { w: 4, h: 8 };
  const ftAt = (e: React.MouseEvent) => {
    const r = gridRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.floor((e.clientX - r.left) / FT)), y: Math.max(0, Math.floor((e.clientY - r.top) / FT)) };
  };
  function startPlacing(t: "bed" | "feat", kind: string) { setView("true"); setEdit(false); setPlacing({ t, kind }); setDraft(null); setGhost(null); }
  function cancelPlacing() { setPlacing(null); setDraft(null); setGhost(null); placeDrag.current = null; setForceGrid(false); }
  function savePlaced() {
    if (!placing || !draft) return;
    const { x, y, w, h } = draft;
    if (placing.t === "bed") {
      if (!draft.name.trim()) { toast.error("Give the bed a name"); return; }
      const cright = Math.max(0, ...list.filter((b) => b.compact_y < 10).map((b) => b.compact_x + b.w + 1));
      upsert.mutate({ name: draft.name.trim(), kind: draft.kind, sun: "full", x, y, w, h, compact_x: cright, compact_y: 0 }, {
        onSuccess: () => { toast.success("Bed added"); cancelPlacing(); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      upFeat.mutate({ kind: placing.kind, label: draft.name.trim() || null, x, y, w, h } as never, {
        onSuccess: () => { toast.success("Added"); cancelPlacing(); },
        onError: (e) => toast.error(e.message),
      });
    }
  }
  useEffect(() => {
    if (add) { startPlacing("bed", "raised"); navigate({ to: "/map", search: {}, replace: true }); }
    else if (feature) { startPlacing("feat", "path"); navigate({ to: "/map", search: {}, replace: true }); }
  }, [add, feature]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!placing) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && cancelPlacing();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [placing]);

  const forecast = growing.filter((p) => p.status === "growing").map((p) => {
    const h = harvestInfo(p, zone);
    return { p, h, until: harvestUntil(p.crop_slug, h.harvest, zone) };
  });
  const now = new Date();
  const ready = forecast.filter((x) => x.h.daysLeft <= 0 && (x.until ? x.until > now : x.h.daysLeft > -21))
    .sort((a, b) => (a.until?.getTime() ?? 0) - (b.until?.getTime() ?? 0));
  const upcoming = forecast.filter((x) => x.h.daysLeft > 0).sort((a, b) => a.h.daysLeft - b.h.daysLeft).slice(0, 6);

  return (
    <AppShell>
      <VoicePlant className="mb-4" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as never)} className="rounded-xl border bg-card p-1">
          <ToggleGroupItem value="true" className="rounded-lg px-3 text-xs">True scale</ToggleGroupItem>
          <ToggleGroupItem value="compact" className="rounded-lg px-3 text-xs">At a glance</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" variant={edit ? "default" : "outline"} className="rounded-xl" onClick={() => setEdit(!edit)}>
          <Move className="mr-1 h-4 w-4" />{edit ? "Done arranging" : "Arrange"}
        </Button>
        {view === "true" && profile && (
          <div className="flex items-center gap-1 rounded-xl border bg-card px-2 py-1 text-xs">
            <span className="font-semibold text-muted-foreground">Yard</span>
            <Input key={`w${yard.w}`} type="number" defaultValue={yard.w} min={minW} className="h-7 w-14 px-1 text-xs" aria-label="Yard width in feet"
              onBlur={(e) => +e.target.value !== yard.w && saveYard(+e.target.value, yard.h)} />
            <span>x</span>
            <Input key={`h${yard.h}`} type="number" defaultValue={yard.h} min={minH} className="h-7 w-14 px-1 text-xs" aria-label="Yard length in feet"
              onBlur={(e) => +e.target.value !== yard.h && saveYard(yard.w, +e.target.value)} />
            <span>ft</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => saveYard(minW, minH)}>Fit to beds</Button>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="ml-auto rounded-xl"><Plus className="mr-1 h-4 w-4" />Add<ChevronDown className="ml-1 h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => startPlacing("bed", "raised")}>🌱 Bed or planting area</DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(FEATURE_KINDS).map(([key, k]) => (
              <DropdownMenuItem key={key} onClick={() => startPlacing("feat", key)}>
                <span className={cn("mr-1 flex h-4 w-4 items-center justify-center text-xs", k.cls)}>{k.emoji}</span>{k.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {placing && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-accent px-4 py-2 text-sm text-accent-foreground">
          <span>{draft ? "Name it and press Enter to save." : `Click the map to drop a ${placing.t === "bed" ? "bed" : (FEATURE_KINDS[placing.kind]?.label ?? "feature").toLowerCase()}, or drag to draw its size.`} Esc to cancel.</span>
          <Button size="sm" variant="ghost" onClick={cancelPlacing}>Cancel</Button>
        </div>
      )}
      {list.length === 0 && !beds.isLoading && !forceGrid ? (
        <Card className="py-10 text-center">
          <div className="text-4xl">🌱</div>
          <h2 className="mt-2 text-xl font-bold">Start your yard map</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add your first bed, or load the layout from your garden sketch to see how it works.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => { setForceGrid(true); startPlacing("bed", "raised"); }}>Add a bed</Button>
            <Button variant="outline" disabled={loading} onClick={async () => {
              setLoading(true);
              try { await loadSampleGarden(); qc.invalidateQueries(); toast.success("Sample garden loaded"); }
              catch (e) { toast.error((e as Error).message); }
              setLoading(false);
            }}>Load sample garden</Button>
          </div>
        </Card>
      ) : (
        <div ref={wrapRef} className={cn("relative", full && "fixed inset-0 z-50 flex flex-col bg-background")}>
          {preview && (
            <button onClick={() => setFull(true)} className="absolute inset-0 z-30 flex items-end justify-center rounded-3xl bg-gradient-to-t from-background/90 via-transparent to-transparent pb-5" aria-label="Open map">
              <span className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg"><Maximize2 className="h-4 w-4" />Tap to open map</span>
            </button>
          )}
          {full && (
            <div className="flex items-center gap-2 border-b bg-card px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
              <span className="min-w-0 flex-1 truncate font-bold">{placing ? (draft ? "Name it to save" : "Scroll, then tap to place") : "Yard map"}</span>
              {placing && <Button size="sm" variant="ghost" onClick={cancelPlacing}>Cancel</Button>}
              <Button size="sm" variant={edit ? "default" : "outline"} onClick={() => setEdit(!edit)}><Move className="mr-1 h-4 w-4" />{edit ? "Done" : "Arrange"}</Button>
              <Button size="icon" variant="ghost" onClick={() => { setFull(false); setEdit(false); }} aria-label="Close map"><X className="h-5 w-5" /></Button>
            </div>
          )}
          <Card className={cn("relative p-3", full ? "flex-1 overflow-auto rounded-none border-0" : preview ? "max-h-[55vh] overflow-hidden" : "overflow-auto")}>
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{view === "compact" ? "Beds arranged side by side for quick tracking." : "Real positions in feet."} {edit ? (view === "true" ? "Drag beds to move them, drag a bed's corner to resize it, or drag the yard's corner to resize the yard." : "Drag beds to move them, or drag a bed's corner to resize it.") : "Tap a bed to open it."}</span>
            <span className="flex items-center gap-1.5"><span className="bed-raised h-3 w-4" />Raised bed</span>
            <span className="flex items-center gap-1.5"><span className="bed-ground h-3 w-4" />In-ground soil</span>
            <span className="flex items-center gap-1.5"><span className="bed-pot h-3 w-3" />Pot / container</span>
            {view === "compact" && (features.data?.length ?? 0) > 0 && <span>Walls, paths and other features show in True scale.</span>}
          </div>
          <div
            ref={gridRef}
            className={cn("relative bg-soil/40", (!coarse || edit) && "touch-none", preview && "pointer-events-none")}
            style={{
              width: (gridW + (placing ? 12 : 0)) * FT, height: (gridH + (placing ? 12 : 0)) * FT,
              backgroundImage: "linear-gradient(to right, color-mix(in oklab, var(--primary) 10%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--primary) 10%, transparent) 1px, transparent 1px)",
              backgroundSize: `${FT}px ${FT}px`,
            }}
          >
            {view === "true" && edit && (
              <div
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); resize.current = { sx: e.clientX, sy: e.clientY, w: maxX, h: maxY }; setYardDraft({ w: maxX, h: maxY }); }}
                className="absolute -bottom-2 -right-2 z-20 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-md border-2 border-primary bg-card text-[10px] text-primary shadow"
                aria-label="Resize yard" title="Drag to resize yard"
              >⤡</div>
            )}
            {placing && (
              <div className={cn("absolute inset-0 z-30", draft ? "" : "cursor-crosshair")}
                onClick={(e) => { if (!coarse || draft) return; const p = ftAt(e); const r = { ...p, ...defSize }; setGhost(r); setDraft({ ...r, name: "", kind: placing.kind }); }}
                onPointerDown={(e) => { if (coarse || draft) return; e.preventDefault(); e.stopPropagation(); const p = ftAt(e); placeDrag.current = p; setGhost({ ...p, w: 1, h: 1 }); }}
                onPointerMove={(e) => {
                  if (coarse || draft) return;
                  const p = ftAt(e), d = placeDrag.current;
                  if (d) setGhost({ x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), w: Math.abs(p.x - d.x) + 1, h: Math.abs(p.y - d.y) + 1 });
                  else setGhost({ ...p, ...defSize });
                }}
                onPointerLeave={() => !placeDrag.current && !draft && setGhost(null)}
                onPointerUp={(e) => {
                  if (coarse || draft) return;
                  const d = placeDrag.current; placeDrag.current = null;
                  if (!d) return;
                  const p = ftAt(e);
                  const r = p.x === d.x && p.y === d.y ? { ...d, ...defSize } : { x: Math.min(d.x, p.x), y: Math.min(d.y, p.y), w: Math.abs(p.x - d.x) + 1, h: Math.abs(p.y - d.y) + 1 };
                  setGhost(r);
                  setDraft({ ...r, name: "", kind: placing.kind });
                }}
              >
                {ghost && (
                  <div className={cn("pointer-events-none absolute border-2 border-dashed border-primary bg-primary/15", placing.t === "bed" && (draft?.kind ?? placing.kind) === "container" && "rounded-full")}
                    style={{ left: ghost.x * FT, top: ghost.y * FT, width: ghost.w * FT, height: ghost.h * FT }}>
                    <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{ghost.w}×{ghost.h} ft</span>
                  </div>
                )}
                {draft && (
                  <div className="absolute z-40 w-60 space-y-2 rounded-2xl border bg-card p-3 shadow-xl"
                    style={{ left: (draft.x + draft.w) * FT + 8, top: draft.y * FT }}
                    onPointerDown={(e) => e.stopPropagation()}>
                    <Input autoFocus value={draft.name} placeholder={placing.t === "bed" ? "Bed name, e.g. Herb bed" : `Label (optional) - ${FEATURE_KINDS[placing.kind]?.label}`}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") savePlaced(); if (e.key === "Escape") cancelPlacing(); }} />
                    {placing.t === "bed" && (
                      <div className="flex gap-1">
                        {([["raised", "Raised"], ["in-ground", "In-ground"], ["container", "Container"]] as const).map(([k, l]) => (
                          <button key={k} type="button" onClick={() => setDraft({ ...draft, kind: k })}
                            className={cn("flex-1 rounded-lg border-2 px-1 py-1 text-[11px] font-semibold", draft.kind === k ? "border-primary bg-accent" : "border-transparent bg-muted")}>{l}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setDraft(null); setGhost(null); }}>Redo</Button>
                      <Button size="sm" className="flex-1" onClick={savePlaced}>Save</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {feats.map((f) => {
              const p = featAt(f);
              const sz = sizes[f.id] ?? { w: f.w, h: f.h };
              const k = FEATURE_KINDS[f.kind] ?? FEATURE_KINDS["other"]!;
              const name = f.label || k.label;
              return (
                <div key={f.id}
                  onPointerDown={(e) => onDown(e, f, "feat")}
                  onClick={() => !edit && setEditFeat(f)}
                  className={cn("group/tip absolute flex items-center justify-center overflow-visible", k.cls, edit ? "cursor-move ring-2 ring-primary/60" : "cursor-pointer")}
                  style={{ left: p.x * FT, top: p.y * FT, width: sz.w * FT, height: sz.h * FT }}
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground shadow group-hover/tip:block">{`${name} · ${sz.w}x${sz.h} ft`}</span>
                  {(() => { const ic = (f as { icon?: string | null }).icon || k.emoji; const s = Math.max(12, Math.min(sz.w, sz.h) * FT * 0.55); return ic ? (ic.startsWith("data:") ? <img src={ic} alt="" style={{ width: s * 1.3, height: s * 1.3 }} className="pointer-events-none select-none object-contain" /> : <span style={{ fontSize: s }} className="pointer-events-none select-none leading-none">{ic}</span>) : null; })()}
                  {(sz.w >= 4 || sz.h >= 4) && !((f as { icon?: string | null }).icon || k.emoji) && <span className="pointer-events-none select-none rounded bg-card/80 px-1 text-[9px] font-bold uppercase text-muted-foreground">{name}</span>}
                  {edit && (
                    <div onPointerDown={(e) => startRz(e, "feat", f.id, f.w, f.h)} onClick={(e) => e.stopPropagation()}
                      className="absolute -bottom-1.5 -right-1.5 z-20 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-card shadow"
                      aria-label={`Resize ${name}`} title="Drag to resize" />
                  )}
                </div>
              );
            })}
            {list.map((b) => {
              const p = shown(b);
              const cells = growing.filter((g) => g.bed_id === b.id);
              const blocks = (sections.data ?? []).filter((s) => s.bed_id === b.id);
              const sz = sizes[b.id] ?? { w: b.w, h: b.h };
              const isPot = b.kind === "container";
              const potSize = Math.min(sz.w, sz.h) * FT * 0.8;
              return (
                <div key={b.id} className="absolute" style={{ left: p.x * FT, top: p.y * FT }}>
                  <div
                    onPointerDown={(e) => onDown(e, b)}
                    onClick={() => !edit && navigate({ to: "/beds/$bedId", params: { bedId: b.id } })}
                    className={cn(
                      "relative cursor-pointer",
                      !edit && "transition-transform hover:-translate-y-px",
                      isPot ? "bed-pot" : b.kind === "in-ground" ? "bed-ground" : "bed-raised",
                      edit && "cursor-move ring-2 ring-primary ring-offset-1",
                    )}
                    style={{ width: sz.w * FT, height: sz.h * FT }}
                  >
                    {isPot ? (
                      <div className="group/tip absolute inset-0 flex items-center justify-center">
                        {cells[0] && <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground shadow group-hover/tip:block">{`${plantName(cells[0])}`}</span>}
                        {cells[0] && <PlantIcon slug={cells[0].crop_slug} color={cells[0].color} icon={cells[0].icon} size={potSize} />}
                      </div>
                    ) : [...blocks.map((s) => (
                      <div key={s.id} className="group/tip absolute flex items-center justify-center rounded-sm" style={{ left: s.x * FT, top: s.y * FT, width: s.w * FT, height: s.h * FT, background: sectionFill(s.kind) }}>
                        <span className="pointer-events-none text-[10px] leading-none">{sectionKind(s.kind).emoji}</span>
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground shadow group-hover/tip:block">{sectionName(s)}</span>
                      </div>
                    )), ...cells.map((c) => (
                      <div key={c.id} className="group/tip absolute flex items-center justify-center" style={{ left: c.cell_x * FT, top: c.cell_y * FT, width: (c.cell_w ?? 1) * FT, height: (c.cell_h ?? 1) * FT }}>
                        <PlantIcon slug={c.crop_slug} color={c.color} icon={c.icon} size={Math.min(c.cell_w ?? 1, c.cell_h ?? 1) * FT - 6} />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground shadow group-hover/tip:block">{`${plantName(c)}`}</span>
                      </div>
                    ))]}
                    {activePestBeds.has(b.id) && <span className="absolute -right-1.5 -top-1.5 text-xs">🐛</span>}
                    {edit && (
                      <div
                        onPointerDown={(e) => {
                          const mine = growing.filter((g) => g.bed_id === b.id);
                          startRz(e, "bed", b.id, b.w, b.h,
                            Math.max(1, ...mine.map((g) => g.cell_x + (g.cell_w ?? 1))),
                            Math.max(1, ...mine.map((g) => g.cell_y + (g.cell_h ?? 1))));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-1.5 -right-1.5 z-20 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-card shadow"
                        aria-label={`Resize ${b.name}`} title="Drag to resize bed"
                      />
                    )}
                  </div>
                  <div className="relative z-10 mt-1.5 inline-flex max-w-[220px] items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
                    <span className="truncate">{b.name}</span>
                    <span className="shrink-0 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{sz.w}×{sz.h} ft</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card></div>
      )}

      {(ready.length > 0 || upcoming.length > 0) && (
        <div className="mt-6 grid gap-4 rounded-3xl bg-ink p-6 text-ink-foreground md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-sm font-bold">Ready to harvest</h3>
            {ready.length === 0 && <p className="text-xs opacity-70">Nothing ready yet.</p>}
            <div className="space-y-3">
              {ready.map(({ p, until }) => (
                <Link key={p.id} to="/beds/$bedId" params={{ bedId: p.bed_id }} className="flex items-center gap-3">
                  <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={36} />
                  <div className="flex-1 text-xs">
                    <div className="font-bold">{plantName(p)}</div>
                    <div className="opacity-70">{until ? `Pick regularly · yields until ~${fmt(until)}` : "Ready to pick (one-time harvest)"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-bold">Coming up</h3>
            {upcoming.length === 0 && <p className="text-xs opacity-70">Nothing else on the way.</p>}
            <div className="space-y-4">
              {upcoming.map(({ p, h }) => (
                <Link key={p.id} to="/beds/$bedId" params={{ bedId: p.bed_id }} className="flex items-center gap-3">
                  <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={36} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{plantName(p)}</span>
                      <span>{h.daysLeft} days · {fmt(h.harvest)}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-foreground/10">
                      <div className="h-full bg-primary" style={{ width: `${h.progress * 100}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}


      <FeatureDialog open={!!editFeat} feature={editFeat} onClose={() => setEditFeat(null)} />
    </AppShell>
  );
}

function FeatureDialog({ open, feature, onClose }: { open: boolean; feature: YardFeature | null; onClose: () => void }) {
  const upsert = useUpsert("yard_features");
  const remove = useRemove("yard_features");
  const [f, setF] = useState<{ kind: string; label: string; w: number; h: number; icon: string | null }>({ kind: "path", label: "", w: 3, h: 12, icon: null });
  useEffect(() => {
    if (!open) return;
    setF(feature ? { kind: feature.kind, label: feature.label ?? "", w: feature.w, h: feature.h, icon: (feature as { icon?: string | null }).icon ?? null } : { kind: "path", label: "", w: 3, h: 12, icon: null });
  }, [open, feature]);
  const save = () => {
    const row = { kind: f.kind, label: f.label.trim() || null, w: Math.max(1, f.w), h: Math.max(1, f.h), icon: f.icon };
    upsert.mutate((feature ? { id: feature.id, ...row } : { ...row, x: 0, y: 0 }) as never, {
      onSuccess: () => { toast.success(feature ? "Saved" : "Added - turn on Arrange to drag it into place"); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{feature ? "Edit yard feature" : "Add a wall, fence, path or other feature"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(FEATURE_KINDS).map(([key, k]) => (
              <button key={key} type="button" onClick={() => setF({ ...f, kind: key, ...(feature ? {} : FEATURE_DEFAULTS[key] ?? { w: 2, h: 2 }) })}
                className={cn("flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] font-semibold", f.kind === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                <span className={cn("flex h-6 w-6 items-center justify-center text-sm", k.cls)}>{k.emoji}</span>{k.label}
              </button>
            ))}
          </div>
          <div>
            <Label>Icon</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              <button type="button" onClick={() => setF({ ...f, icon: null })} className={cn("h-9 rounded-lg border-2 px-2 text-xs font-semibold", !f.icon ? "border-primary bg-accent" : "border-transparent bg-muted")}>Default</button>
              {FEATURE_ICONS.map((e) => (
                <button key={e} type="button" onClick={() => setF({ ...f, icon: e })} className={cn("h-9 w-9 rounded-lg border-2 text-lg", f.icon === e ? "border-primary bg-accent" : "border-transparent bg-muted hover:border-primary")}>{e}</button>
              ))}
              {f.icon?.startsWith("data:") && <img src={f.icon} alt="" className="h-9 w-9 rounded-lg border-2 border-primary object-contain" />}
            </div>
            <div className="mt-2"><CustomIcon defaultSubject={f.label || FEATURE_KINDS[f.kind]?.label || "yard feature"} current={f.icon} onPick={(d) => setF({ ...f, icon: d })} /></div>
          </div>
          <div><Label>Label (optional)</Label><Input value={f.label} placeholder={FEATURE_KINDS[f.kind]?.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Width (ft)</Label><Input type="number" min={1} max={200} value={f.w || ""} onChange={(e) => setF({ ...f, w: Math.min(200, +e.target.value) })} onBlur={() => setF({ ...f, w: Math.max(1, f.w) })} /></div>
            <div><Label>Length (ft)</Label><Input type="number" min={1} max={200} value={f.h || ""} onChange={(e) => setF({ ...f, h: Math.min(200, +e.target.value) })} onBlur={() => setF({ ...f, h: Math.max(1, f.h) })} /></div>
          </div>
          <div className="flex gap-2">
            {feature && <Button variant="outline" onClick={() => remove.mutate(feature.id, { onSuccess: () => { toast.success("Removed"); onClose(); } })}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>}
            <Button className="flex-1" onClick={save} disabled={upsert.isPending}>{feature ? "Save" : "Add to yard"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
