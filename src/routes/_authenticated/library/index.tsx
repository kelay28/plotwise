import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon } from "@/components/PlantIcon";
import { Input } from "@/components/ui/input";
import { CROPS, getCrop } from "@/lib/crops";
import { useUserVarieties, useZone } from "@/lib/garden";
import { inWindowNow } from "@/lib/zones";

export const Route = createFileRoute("/_authenticated/library/")({
  head: () => ({ meta: [{ title: "Plant library - Plotwise" }, { name: "description", content: "Sun, water, planting windows and care for 50 crops." }] }),
  component: Library,
});

function Library() {
  const zone = useZone();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | "vegetable" | "herb" | "fruit" | "now">("all");
  const uv = useUserVarieties();
  const list = CROPS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.varieties.some((v) => v.name.toLowerCase().includes(q.toLowerCase())))
    .filter((c) => cat === "all" || (cat === "now" ? !!inWindowNow(c, zone) : c.category === cat));
  return (
    <AppShell title="Plant library" subtitle={`Timing for zone ${zone.toUpperCase()}`}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search crops or varieties" className="mb-3 rounded-xl" />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "now", "vegetable", "herb", "fruit"] as const).map((k) => (
          <button key={k} onClick={() => setCat(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${cat === k ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
            {k === "now" ? "Plant now" : k === "all" ? "All" : k[0]!.toUpperCase() + k.slice(1) + "s"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Link key={c.slug} to="/library/$slug" params={{ slug: c.slug }}>
            <Card className="flex items-center gap-3 transition hover:border-primary">
              <PlantIcon slug={c.slug} size={44} />
              <div className="min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">{c.sunHours} sun · {c.days} days{inWindowNow(c, zone) ? " · plant now" : ""}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {(uv.data ?? []).length > 0 && (
        <Card className="mt-6">
          <SectionLabel>Your looked-up varieties (AI-sourced, please verify)</SectionLabel>
          <div className="space-y-2">
            {uv.data!.map((v) => (
              <div key={v.id} className="flex gap-3 rounded-xl bg-muted p-3">
                <PlantIcon slug={v.crop_slug} color={v.color} size={36} />
                <div><div className="font-semibold">{v.name} <span className="text-xs text-muted-foreground">({getCrop(v.crop_slug).name}{v.days_to_maturity ? `, ${v.days_to_maturity} days` : ""})</span></div>
                  <p className="text-sm">{v.description}</p><p className="mt-1 text-xs text-muted-foreground">{v.tips}</p></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
