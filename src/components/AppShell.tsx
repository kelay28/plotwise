import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BookOpen, Bug, Camera, ClipboardList, Home, Map, MessageSquareText, MoreHorizontal, Pencil, Plus, Settings2, Shovel, SquarePlus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBeds, useProfile, useUpsert } from "@/lib/garden";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PhotoInput, PhotoTagSheet } from "@/components/PhotoLog";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/map", label: "Map", icon: Map },
  { to: "/log", label: "Log", icon: ClipboardList },
  { to: "/library", label: "Plant Guide", icon: BookOpen },
  { to: "/pests", label: "Issues", icon: Bug },
] as const;
const mobileTabs = [tabs[0], tabs[1], tabs[2], tabs[4]] as const;

export function AppShell({ title, subtitle, actions, children }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const { data: profile } = useProfile();
  const path = useLocation({ select: (l) => l.pathname });
  const zone = (profile?.zone ?? "7b").toUpperCase();
  const [quick, setQuick] = useState(false);
  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card px-4 py-6 md:flex">
        <Link to="/home" className="px-2">
          <div className="font-display text-xl font-bold">Plotwise</div>
          <div className="text-xs font-semibold text-primary">{profile?.garden_name ?? "My Garden"} · Zone {zone}</div>
        </Link>
        <Link to="/map" search={{ add: true }} className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm">
          <Plus className="h-4 w-4" />Add bed
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {tabs.map((t) => (
            <Link key={t.to} to={t.to} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted", path.startsWith(t.to) && "bg-accent text-accent-foreground")}>
              <t.icon className="h-5 w-5" />{t.label}
            </Link>
          ))}
        </nav>
        <Link to="/settings" className={cn("mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted", path.startsWith("/settings") && "bg-accent text-accent-foreground")}>
          <Settings2 className="h-5 w-5" />Settings
        </Link>
      </aside>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl min-w-0 flex-col">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-5 md:px-8 md:pt-8">
          <div className="min-w-0">
            {title ? <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1> : <GardenName />}
            <p className="truncate text-sm font-semibold text-primary">{subtitle ?? `Hardiness Zone ${zone}`}</p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="More" className="flex h-10 w-10 items-center justify-center rounded-xl border bg-card shadow-sm md:hidden"><MoreHorizontal className="h-5 w-5 text-muted-foreground" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/library"><BookOpen className="mr-2 h-4 w-4" />Plant library</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/settings"><Settings2 className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 px-4 pb-32 md:px-8 md:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid h-20 max-w-md grid-cols-5 items-center px-2">
          {mobileTabs.slice(0, 2).map((t) => <Tab key={t.to} t={t} active={path.startsWith(t.to)} />)}
          <button onClick={() => setQuick(true)} aria-label="Quick add"
            className="-mt-10 flex h-16 w-16 items-center justify-center justify-self-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg">
            <Plus className="h-7 w-7" />
          </button>
          {mobileTabs.slice(2).map((t) => <Tab key={t.to} t={t} active={path.startsWith(t.to)} />)}
        </div>
      </nav>
      <QuickActions open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}

/** Garden name; tap the pencil (or the name) to rename. */
function GardenName() {
  const { data: profile } = useProfile();
  const up = useUpsert("profiles");
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const name = profile?.garden_name ?? "My Garden";
  const save = (v: string) => {
    setEditing(false);
    const n = v.trim();
    if (!profile || !n || n === name) return;
    up.mutate({ id: profile.id, garden_name: n } as never, { onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Garden renamed"); }, onError: (e) => toast.error(e.message) });
  };
  if (editing) return (
    <input autoFocus defaultValue={name} aria-label="Garden name" maxLength={60}
      className="w-full rounded-lg bg-muted px-2 text-2xl font-bold outline-none ring-2 ring-primary md:text-3xl"
      onBlur={(e) => save(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }} />
  );
  return (
    <button onClick={() => setEditing(true)} className="group flex max-w-full items-center gap-2 text-left" title="Rename garden">
      <h1 className="truncate text-2xl font-bold md:text-3xl">{name}</h1>
      <Pencil className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
    </button>
  );
}

function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const beds = useBeds();
  const cam = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [pickBed, setPickBed] = useState(false);
  const go = (fn: () => void) => { onClose(); setPickBed(false); fn(); };
  const items = [
    { icon: Camera, label: "Take a photo", sub: "Whole garden, a bed or a plant", run: () => cam.current?.click() },
    { icon: Shovel, label: "Add a planting", sub: "Pick a bed, then tap squares", run: () => setPickBed(true) },
    { icon: Bug, label: "Log an issue", sub: "Pests, disease, wilting...", run: () => go(() => navigate({ to: "/pests" })) },
    { icon: SquarePlus, label: "New bed or patch", sub: "Draw it on the map", run: () => go(() => navigate({ to: "/map", search: { add: true } })) },
    { icon: MessageSquareText, label: "Quick update", sub: '"Potatoes planted today"', run: () => go(() => navigate({ to: "/log" })) },
  ];
  return (
    <>
      <PhotoInput inputRef={cam} camera onFiles={(f) => { onClose(); setFiles(f); }} />
      <PhotoTagSheet files={files} onClose={() => setFiles(null)} />
      <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); setPickBed(false); } }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="pt-6 pb-4"><SheetTitle className="text-2xl font-bold">{pickBed ? "Which bed?" : "Quick add"}</SheetTitle></SheetHeader>
          <div className="mx-auto grid max-w-md gap-2 p-4 pt-2">
            {pickBed ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add to an existing bed</p>
                {beds.isLoading && <p className="text-sm text-muted-foreground">Loading your beds...</p>}
                {beds.data?.length === 0 && <p className="text-sm text-muted-foreground">You don't have any beds yet.</p>}
                {(beds.data ?? []).map((b) => (
                  <button key={b.id} onClick={() => go(() => navigate({ to: "/beds/$bedId", params: { bedId: b.id } }))} className="rounded-2xl bg-muted p-4 text-left font-semibold">{b.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{b.w}×{b.h} ft</span></button>
                ))}
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or start fresh</p>
                <button onClick={() => go(() => navigate({ to: "/map", search: { add: true } }))} className="rounded-2xl border-2 border-dashed border-primary p-4 text-left font-semibold text-primary">+ New bed or patch</button>
              </>
            ) : items.map((it) => (
              <button key={it.label} onClick={it.run} className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-left active:scale-[0.99]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><it.icon className="h-5 w-5" /></span>
                <span><span className="block font-semibold">{it.label}</span><span className="text-xs text-muted-foreground">{it.sub}</span></span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Tab({ t, active }: { t: (typeof tabs)[number]; active: boolean }) {
  return (
    <Link to={t.to} className={cn("flex flex-col items-center gap-1 py-2 text-muted-foreground", active && "text-primary")}>
      <t.icon className="h-6 w-6" />
      <span className="text-[11px] font-semibold">{t.label}</span>
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border bg-card p-4 shadow-sm", className)}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</h3>;
}
