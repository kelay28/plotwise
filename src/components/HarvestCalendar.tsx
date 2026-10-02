import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, CalendarDays, ChevronLeft, ChevronRight, ChevronRight as Arrow } from "lucide-react";
import { PlantIcon } from "@/components/PlantIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Planting } from "@/lib/garden";
import { getCrop } from "@/lib/crops";
import { fmt, harvestInfo } from "@/lib/zones";
import { cn } from "@/lib/utils";

type Group = { key: string; slug: string; p: Planting; name: string; count: number; beds: Set<string>; date: Date };

/** Groups plantings of the same crop/variety harvesting on the same day so the calendar stays short. */
function group(items: { p: Planting; date: Date }[]) {
  const m = new Map<string, Group>();
  for (const { p, date } of items) {
    const name = p.variety ? `${getCrop(p.crop_slug).name} · ${p.variety}` : getCrop(p.crop_slug).name;
    const key = `${date.toDateString()}|${p.crop_slug}|${p.variety ?? ""}`;
    const g = m.get(key);
    if (g) { g.count++; g.beds.add(p.bed_id); } else m.set(key, { key, slug: p.crop_slug, p, name, count: 1, beds: new Set([p.bed_id]), date });
  }
  return [...m.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Compact harvest summary that opens into a month-by-month agenda. */
export function HarvestCalendar({ plantings, zone, show = "all" }: { plantings: Planting[]; zone: string; show?: "all" | "ready" | "calendar" }) {
  const [open, setOpen] = useState(false);
  const [off, setOff] = useState(0);
  const [all, setAll] = useState(false);
  const now = new Date();
  const growing = plantings.filter((p) => p.status === "growing").map((p) => ({ p, date: harvestInfo(p, zone).harvest }));
  const readyNow = group(growing.filter((x) => x.date <= now).map((x) => ({ ...x, date: now })));
  const future = growing.filter((x) => x.date > now);
  const month = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const inMonth = group(future.filter((x) => x.date.getFullYear() === month.getFullYear() && x.date.getMonth() === month.getMonth()));
  const allFuture = group(future);
  const next = allFuture.slice(0, 3);

  return (
    <>
      {show !== "calendar" && readyNow.length > 0 && (
        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Ready now</h4>
          <div className="flex flex-wrap gap-2">
            {readyNow.map((g) => <Chip key={g.key} g={g} />)}
          </div>
        </section>
      )}
      {show !== "ready" && <>
      <button onClick={() => setOpen(true)} className="mt-4 flex w-full items-center gap-4 rounded-3xl border bg-card p-5 text-left shadow-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><CalendarDays className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Harvest log</span>
          <span className="block truncate text-sm text-muted-foreground">
            {readyNow.length > 0 ? `${readyNow.length} crop${readyNow.length > 1 ? "s" : ""} ready now` : "Nothing ready yet"}
            {next[0] ? ` · next: ${next[0].name} ${fmt(next[0].date)}` : ""}
          </span>
        </span>
        <Arrow className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-2xl">
          <SheetHeader className="pt-6 pb-2"><SheetTitle className="text-2xl font-bold">Harvest log</SheetTitle></SheetHeader>
          <div className="space-y-6 px-4">
            {off === 0 && readyNow.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Ready now</h4>
                <div className="flex flex-wrap gap-2">
                  {readyNow.map((g) => <Chip key={g.key} g={g} />)}
                </div>
              </section>
            )}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h4 className="flex-1 text-lg font-bold">{all ? "All upcoming" : month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h4>
                {!all && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setOff(off - 1)} aria-label="Previous month" disabled={off <= 0}><ChevronLeft className="h-5 w-5" /></Button>}
                {!all && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setOff(off + 1)} aria-label="Next month"><ChevronRight className="h-5 w-5" /></Button>}
                <div className="flex rounded-lg border p-0.5 text-xs font-semibold">
                  <button onClick={() => setAll(false)} className={cn("rounded-md px-2.5 py-1.5", !all && "bg-primary text-primary-foreground")}>Month</button>
                  <button onClick={() => setAll(true)} className={cn("rounded-md px-2.5 py-1.5", all && "bg-primary text-primary-foreground")}>See all</button>
                </div>
              </div>
              {(all ? allFuture : inMonth).length === 0 ? <p className="text-sm text-muted-foreground">No new harvests expected this month.</p> : (
                <div className="divide-y rounded-2xl border">
                  {(all ? allFuture : inMonth).map((g) => (
                    <Link key={g.key} to="/beds/$bedId" params={{ bedId: g.p.bed_id }} onClick={() => setOpen(false)} className="flex items-center gap-3 p-3">
                      <div className="w-12 shrink-0 text-center">
                        {all && <div className="text-[10px] font-bold uppercase text-primary">{g.date.toLocaleDateString(undefined, { month: "short" })}</div>}
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">{g.date.toLocaleDateString(undefined, { weekday: "short" })}</div>
                        <div className="text-xl font-bold leading-none">{g.date.getDate()}</div>
                      </div>
                      <PlantIcon slug={g.slug} color={g.p.color} icon={g.p.icon} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{g.name}</div>
                        <div className="text-xs text-muted-foreground">{g.count > 1 ? `${g.count} plantings` : "1 planting"}{g.beds.size > 1 ? ` · ${g.beds.size} beds` : ""}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
      <button onClick={() => downloadIcs(future, zone)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border bg-card p-3 text-sm font-semibold"><Download className="h-4 w-4" />Export to Google Calendar / iCal (.ics)</button>
      </>}
    </>
  );
}

function Chip({ g }: { g: Group }) {
  return (
    <Link to="/beds/$bedId" params={{ bedId: g.p.bed_id }} className={cn("flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3 text-sm font-semibold")}>
      <PlantIcon slug={g.slug} color={g.p.color} icon={g.p.icon} size={26} />
      <span className="max-w-40 truncate">{g.name}</span>
      {g.count > 1 && <span className="rounded-full bg-card px-1.5 text-[11px] font-bold">×{g.count}</span>}
    </Link>
  );
}

function downloadIcs(items: { p: Planting; date: Date }[], _zone: string) {
  const d = (x: Date) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
  const esc = (t: string) => t.replace(/[\\,;]/g, (c) => "\\" + c);
  const ev = group(items).map((g) => {
    const end = new Date(g.date.getTime() + 86400000);
    return ["BEGIN:VEVENT", `UID:${g.key.replace(/[^a-z0-9]/gi, "")}@plotwise`, `DTSTAMP:${d(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${d(g.date)}`, `DTEND;VALUE=DATE:${d(end)}`, `SUMMARY:${esc(`Harvest: ${g.name}${g.count > 1 ? ` (x${g.count})` : ""}`)}`, "END:VEVENT"].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Plotwise//Harvest//EN", "X-WR-CALNAME:Plotwise harvests", ...ev, "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "plotwise-harvests.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}
