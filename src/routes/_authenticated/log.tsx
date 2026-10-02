import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { QuickUpdate } from "@/components/QuickUpdate";
import { HarvestCalendar } from "@/components/HarvestCalendar";
import { PlantIcon } from "@/components/PlantIcon";
import { CROPS, getCrop, plantName } from "@/lib/crops";
import { useBeds, usePlantings, useZone } from "@/lib/garden";
import { fmt, harvestInfo, inWindowNow } from "@/lib/zones";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({ meta: [{ title: "Planting log - Plotwise" }, { name: "description", content: "Planting dates and estimated harvests." }] }),
  component: LogPage,
});

function LogPage() {
  const zone = useZone();
  const plantings = usePlantings();
  const beds = useBeds();
  const bedName = (id: string) => beds.data?.find((b) => b.id === id)?.name ?? "";
  const rows = (plantings.data ?? []).filter((p) => p.status === "growing").map((p) => ({ p, h: harvestInfo(p, zone) })).filter(({ h }) => h.daysLeft > 0).sort((a, b) => a.h.daysLeft - b.h.daysLeft);
  const history = (plantings.data ?? []).filter((p) => p.status !== "growing");
  const now = CROPS.map((c) => ({ c, w: inWindowNow(c, zone) })).filter((x) => x.w);
  return (
    <AppShell title="Planting log" subtitle={`${(plantings.data ?? []).filter((p) => p.status === "growing").length} plants growing`}>
      <div className="mb-5"><HarvestCalendar show="ready" plantings={plantings.data ?? []} zone={zone} /></div>
      <QuickUpdate plantings={plantings.data ?? []} bedName={bedName} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <SectionLabel>Upcoming harvests</SectionLabel>
          {rows.length === 0 && (plantings.data ?? []).some((p) => p.status === "growing") && <p className="text-sm text-muted-foreground">Everything growing is ready now — see above.</p>}
          {(plantings.data ?? []).every((p) => p.status !== "growing") && <p className="text-sm text-muted-foreground">Nothing planted yet. Open a bed on the <Link to="/map" className="text-primary">map</Link> and tap a square.</p>}
          <div className="divide-y">
            {rows.map(({ p, h }) => (
              <Link key={p.id} to="/beds/$bedId" params={{ bedId: p.bed_id }} className="flex items-center gap-3 py-3">
                <PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm font-semibold">
                    <span className="truncate">{plantName(p)}</span>
                    <span className={h.daysLeft <= 0 ? "text-primary" : ""}>{h.daysLeft <= 0 ? "Ready" : `${h.daysLeft}d`}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{bedName(p.bed_id)} · planted {fmt(h.planted)}{h.estimatedDate ? " (est.)" : ""} · harvest ~{fmt(h.harvest)}</div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${h.progress * 100}%` }} /></div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <div className="-mt-4"><HarvestCalendar show="calendar" plantings={plantings.data ?? []} zone={zone} /></div>
          <Card>
            <SectionLabel>Plant this month · zone {zone.toUpperCase()}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {now.length ? now.map(({ c, w }) => (
                <Link key={c.slug} to="/library/$slug" params={{ slug: c.slug }} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                  <PlantIcon slug={c.slug} size={20} />{c.name} <span className="text-muted-foreground">til {fmt(w!.end)}</span>
                </Link>
              )) : <p className="text-sm text-muted-foreground">Nothing in its window right now.</p>}
            </div>
          </Card>
          {history.length > 0 && (
            <Card>
              <SectionLabel>History</SectionLabel>
              {history.map((p) => <div key={p.id} className="flex items-center gap-2 py-1 text-sm"><PlantIcon slug={p.crop_slug} color={p.color} icon={p.icon} size={22} />{p.variety ?? getCrop(p.crop_slug).name} <span className="text-xs text-muted-foreground">· {p.status} · {bedName(p.bed_id)}</span></div>)}
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
