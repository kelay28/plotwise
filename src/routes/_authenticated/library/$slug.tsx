import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { PlantIcon, useCropIcons } from "@/components/PlantIcon";
import { CustomIcon } from "@/components/CustomIcon";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCrop, PESTS, CROP_MAP } from "@/lib/crops";
import { useUserVarieties, useZone } from "@/lib/garden";
import { fmt, plantingWindows } from "@/lib/zones";

export const Route = createFileRoute("/_authenticated/library/$slug")({
  head: () => ({ meta: [{ title: "Plant guide - Plotwise" }, { name: "description", content: "Growing guide: sun, water, timing, pests and propagation." }] }),
  component: CropPage,
});

function CropPage() {
  const { slug } = Route.useParams();
  const zone = useZone();
  const crop = getCrop(slug);
  const uv = (useUserVarieties().data ?? []).filter((v) => v.crop_slug === slug);
  const year = new Date().getFullYear();
  const windows = plantingWindows(crop, zone, year);
  const name = (s: string) => CROP_MAP[s]?.name ?? s;
  const qc = useQueryClient();
  const saved = useCropIcons().data?.[slug];
  const setIcon = async (icon: string | null) => {
    const t = supabase.from("crop_icons" as never);
    const { error } = icon ? await t.upsert({ crop_slug: slug, icon } as never, { onConflict: "user_id,crop_slug" }) : await t.delete().eq("crop_slug" as never, slug as never);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["crop_icons"] });
    toast.success(icon ? "Picture saved for all " + crop.name : "Back to the default picture");
  };
  return (
    <AppShell title={crop.name} subtitle={`${crop.category}${crop.perennial ? " · perennial" : ""}`}
      actions={<Button variant="outline" size="icon" className="rounded-xl" asChild><Link to="/library" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center gap-4 md:col-span-2">
          <PlantIcon slug={slug} size={72} />
          <div className="grid flex-1 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat k="Sun" v={crop.sunHours} /><Stat k="Water" v={crop.water} /><Stat k="Spacing" v={`${crop.spacingIn} in`} /><Stat k="Maturity" v={`${crop.days} days`} />
          </div>
        </Card>
        <Card className="md:col-span-2">
          <SectionLabel>Picture</SectionLabel>
          <p className="text-sm text-muted-foreground">Used everywhere {crop.name} appears, unless a planting has its own picture.</p>
          {saved && <Button size="sm" variant="ghost" className="mt-1" onClick={() => setIcon(null)}>Reset to default</Button>}
          <CustomIcon defaultSubject={crop.name} current={saved ?? null} onPick={(u) => { void setIcon(u); }} />
        </Card>
        <Card>
          <SectionLabel>When to plant · zone {zone.toUpperCase()}</SectionLabel>
          {windows.length ? windows.map((w) => (
            <p key={w.label} className="text-sm"><b>{w.label}:</b> {fmt(w.start)} - {fmt(w.end)} ({crop.start === "seed" ? "direct seed" : crop.start})</p>
          )) : <p className="text-sm text-muted-foreground">No set window.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Based on average frost dates; adjust for your microclimate.</p>
        </Card>
        <Card><SectionLabel>Pruning & trimming</SectionLabel><p className="text-sm">{crop.pruning}</p></Card>
        <Card><SectionLabel>Feeding</SectionLabel><p className="text-sm">{crop.feeding}</p></Card>
        <Card>
          <SectionLabel>Companions</SectionLabel>
          <p className="text-sm"><b>Good near:</b> {crop.companions.map(name).join(", ") || "-"}</p>
          <p className="mt-1 text-sm"><b>Keep away from:</b> {crop.avoid.map(name).join(", ") || "-"}</p>
        </Card>
        <Card>
          <SectionLabel>Propagation & seed saving</SectionLabel>
          <p className="text-sm">{crop.propagation}</p><p className="mt-2 text-sm">{crop.seedSaving}</p>
        </Card>
        <Card>
          <SectionLabel>Common pests & treatments</SectionLabel>
          {crop.pests.length ? crop.pests.map((k) => (
            <p key={k} className="mb-2 text-sm"><b>{PESTS[k].name}:</b> {PESTS[k].treatment}{PESTS[k].repeatDays ? ` Repeat every ${PESTS[k].repeatDays} days.` : ""}</p>
          )) : <p className="text-sm text-muted-foreground">Few serious pests.</p>}
        </Card>
        {(crop.varieties.length > 0 || uv.length > 0) && (
          <Card className="md:col-span-2">
            <SectionLabel>Varieties</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {crop.varieties.map((v) => <span key={v.name} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"><PlantIcon slug={slug} color={v.color} size={22} />{v.name}{v.days ? ` · ${v.days}d` : ""}</span>)}
              {uv.map((v) => <span key={v.id} className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm"><PlantIcon slug={slug} color={v.color} size={22} />{v.name} (AI)</span>)}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

const Stat = ({ k, v }: { k: string; v: string }) => <div><div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>;
