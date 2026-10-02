import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Images, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBeds, usePlantings } from "@/lib/garden";
import { type GardenPhoto, type PhotoMeta, useDeletePhoto, usePhotos, useUploadPhotos } from "@/lib/photos";
import { plantName } from "@/lib/crops";
import { fmtY } from "@/lib/zones";
import { cn } from "@/lib/utils";

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const LAST_BED = "plotwise:lastPhotoBed";

/** Hidden camera/library input. Call .click() on the ref to open it. */
export function PhotoInput({ inputRef, onFiles, camera }: { inputRef: React.RefObject<HTMLInputElement | null>; onFiles: (f: File[]) => void; camera?: boolean }) {
  return <input ref={inputRef} type="file" accept="image/*" multiple={!camera} {...(camera ? { capture: "environment" as const } : {})} className="hidden"
    onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) onFiles(f); }} />;
}

/** Photo timeline. With no bed/planting it shows the whole garden; otherwise it's scoped. */
export function PhotoLog({ bedId, plantingId, title = "Garden photo log", limit, compact }: { bedId?: string | undefined; plantingId?: string | undefined; title?: string; limit?: number; compact?: boolean }) {
  const photos = usePhotos({ bedId: plantingId ? undefined : bedId, plantingId, limit });
  const [files, setFiles] = useState<File[] | null>(null);
  const [view, setView] = useState<number | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);
  const list = photos.data ?? [];
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{title}</SectionLabel>
        <div className="flex gap-1">
          <Button size="sm" onClick={() => cam.current?.click()}><Camera className="mr-1 h-4 w-4" />Photo</Button>
          <Button size="sm" variant="outline" onClick={() => lib.current?.click()} aria-label="Choose from library"><Images className="h-4 w-4" /></Button>
        </div>
      </div>
      <PhotoInput inputRef={cam} onFiles={setFiles} camera />
      <PhotoInput inputRef={lib} onFiles={setFiles} />
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{photos.isLoading ? "Loading..." : "No photos yet. Snap one to track how things change over time."}</p>
      ) : (
        <div className={compact ? "-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" : "flex snap-x gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-6"}>
          {list.map((p, i) => (
            <button key={p.id} onClick={() => setView(i)} className={cn("relative shrink-0 snap-start overflow-hidden rounded-xl bg-muted", compact ? "h-20 w-20" : "h-32 w-32 md:aspect-square md:h-auto md:w-auto")}>
              {p.url && <img src={p.url} alt={p.caption ?? "Garden photo"} loading="lazy" className="h-full w-full object-cover" />}
              <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1 text-[10px] font-semibold text-ink-foreground">{fmtY(new Date(p.taken_on + "T12:00"))}</span>
            </button>
          ))}
        </div>
      )}
      <PhotoTagSheet files={files} onClose={() => setFiles(null)} bedId={bedId} plantingId={plantingId} />
      <PhotoViewer photos={list} index={view} onIndex={setView} />
    </>
  );
  return compact ? <div className="space-y-2">{body}</div> : <Card>{body}</Card>;
}

/** After picking photos: tag them to the whole garden, a bed, or a plant. */
export function PhotoTagSheet({ files, onClose, bedId, plantingId, onSaved }: { files: File[] | null; onClose: () => void; bedId?: string | undefined; plantingId?: string | undefined; onSaved?: (ids: string[]) => void }) {
  const beds = useBeds();
  const plantings = usePlantings();
  const upload = useUploadPhotos();
  const fixed = !!(bedId || plantingId);
  const [bed, setBed] = useState<string | null>(null);
  const [plant, setPlant] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(today());
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!files) return;
    setBed(fixed ? null : localStorage.getItem(LAST_BED)); setPlant(null); setCaption(""); setDate(today());
    const u = files.map((f) => URL.createObjectURL(f)); setUrls(u);
    return () => u.forEach(URL.revokeObjectURL);
  }, [files, fixed]);
  const bedList = beds.data ?? [];
  const validBed = bed && bedList.some((b) => b.id === bed) ? bed : null;
  const bedPlants = (plantings.data ?? []).filter((p) => p.bed_id === validBed && p.status !== "removed");
  const save = () => {
    if (!files?.length) return;
    const meta: PhotoMeta = fixed
      ? { scope: plantingId ? "planting" : "bed", bed_id: bedId ?? null, planting_id: plantingId ?? null, caption: caption || null, taken_on: date }
      : { scope: plant ? "planting" : validBed ? "bed" : "garden", bed_id: validBed, planting_id: plant, caption: caption || null, taken_on: date };
    if (!fixed) { if (validBed) localStorage.setItem(LAST_BED, validBed); else localStorage.removeItem(LAST_BED); }
    upload.mutate({ files, meta }, {
      onSuccess: (ids) => { toast.success(files.length > 1 ? `${files.length} photos saved` : "Photo saved"); onSaved?.(ids); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  };
  return (
    <Sheet open={!!files} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader><SheetTitle>{files && files.length > 1 ? `Tag ${files.length} photos` : "Tag photo"}</SheetTitle></SheetHeader>
        <div className="mx-auto max-w-lg space-y-4 p-4 pt-0">
          <div className="flex gap-2 overflow-x-auto">{urls.map((u) => <img key={u} src={u} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />)}</div>
          {!fixed && (
            <>
              <div>
                <Label>Where is this?</Label>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button onClick={() => { setBed(null); setPlant(null); }} className={cn("rounded-xl border-2 p-3 text-left text-sm font-semibold", !validBed ? "border-primary bg-accent" : "border-transparent bg-muted")}>🏡 Whole garden</button>
                  {bedList.map((b) => (
                    <button key={b.id} onClick={() => { setBed(b.id); setPlant(null); }} className={cn("truncate rounded-xl border-2 p-3 text-left text-sm font-semibold", validBed === b.id ? "border-primary bg-accent" : "border-transparent bg-muted")}>{b.name}</button>
                  ))}
                </div>
              </div>
              {validBed && bedPlants.length > 0 && (
                <div>
                  <Label>A specific plant? (optional)</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {bedPlants.map((p) => (
                      <button key={p.id} onClick={() => setPlant(plant === p.id ? null : p.id)} className={cn("flex items-center gap-1 rounded-full border-2 py-1 pl-1 pr-2.5 text-xs font-medium", plant === p.id ? "border-primary bg-accent" : "border-transparent bg-muted")}>
                        <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={26} />{plantName(p)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Taken on</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} /></div>
            <div><Label>Caption</Label><Input value={caption} placeholder="Optional" onChange={(e) => setCaption(e.target.value)} /></div>
          </div>
          <Button className="h-12 w-full text-base" onClick={save} disabled={upload.isPending}>{upload.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
          <p className="text-center text-[11px] text-muted-foreground">Photos are private to your account and resized to save space.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Full-screen viewer with swipe / arrow navigation. */
function PhotoViewer({ photos, index, onIndex }: { photos: GardenPhoto[]; index: number | null; onIndex: (i: number | null) => void }) {
  const del = useDeletePhoto();
  const beds = useBeds();
  const plantings = usePlantings();
  const touch = useRef<number | null>(null);
  const photo = index != null ? photos[index] : undefined;
  if (!photo || index == null) return null;
  const go = (d: number) => onIndex(Math.max(0, Math.min(photos.length - 1, index + d)));
  const bed = beds.data?.find((b) => b.id === photo.bed_id);
  const plant = plantings.data?.find((p) => p.id === photo.planting_id);
  const tag = photo.scope === "planting" && plant ? `${plantName(plant)} · ${bed?.name ?? ""}` : photo.scope === "bed" && bed ? bed.name : "Whole garden";
  return (
    <Dialog open onOpenChange={(o) => !o && onIndex(null)}>
      <DialogContent className="flex h-[100dvh] max-w-none flex-col gap-0 border-0 bg-ink p-0 text-ink-foreground sm:h-[90vh] sm:max-w-4xl sm:rounded-2xl [&>button]:hidden"
        onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}>
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0"><div className="truncate font-semibold">{tag}</div><div className="text-xs opacity-70">{fmtY(new Date(photo.taken_on + "T12:00"))} · {index + 1}/{photos.length}</div></div>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" className="text-ink-foreground" onClick={() => confirm("Delete this photo?") && del.mutate(photo, { onSuccess: () => onIndex(photos.length > 1 ? Math.max(0, index - 1) : null) })} aria-label="Delete photo"><Trash2 className="h-5 w-5" /></Button>
            <Button size="icon" variant="ghost" className="text-ink-foreground" onClick={() => onIndex(null)} aria-label="Close"><X className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center"
          onTouchStart={(e) => (touch.current = e.touches[0]!.clientX)}
          onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0]!.clientX - touch.current; touch.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
          {photo.url && <img src={photo.url} alt={photo.caption ?? ""} className="max-h-full max-w-full object-contain" />}
          {index > 0 && <button onClick={() => go(-1)} className="absolute left-2 hidden rounded-full bg-ink/60 p-2 sm:block" aria-label="Previous"><ChevronLeft /></button>}
          {index < photos.length - 1 && <button onClick={() => go(1)} className="absolute right-2 hidden rounded-full bg-ink/60 p-2 sm:block" aria-label="Next"><ChevronRight /></button>}
        </div>
        {photo.caption && <p className="p-3 text-sm">{photo.caption}</p>}
      </DialogContent>
    </Dialog>
  );
}
