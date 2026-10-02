import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Card, SectionLabel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { backupFilename, buildBackup, downloadJson, readBackupFile, restoreBackup } from "@/lib/backup";
import { loadSampleGarden, useProfile, useUpsert } from "@/lib/garden";
import { fmt, frostDates, ZONE_KEYS } from "@/lib/zones";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings - Plotwise" }, { name: "description", content: "Zone and garden settings." }] }),
  component: Settings,
});

function Settings() {
  const profile = useProfile();
  const up = useUpsert("profiles");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [zone, setZone] = useState("7b");
  const [name, setName] = useState("My Garden");
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (profile.data) { setZone(profile.data.zone); setName(profile.data.garden_name); } }, [profile.data]);
  const f = frostDates(zone, new Date().getFullYear());

  async function exportData() {
    setBusy("export");
    try { downloadJson(await buildBackup(), backupFilename()); toast.success("Backup downloaded"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  async function importData(file: File) {
    setBusy("import");
    try {
      const { rows, counts } = await readBackupFile(file);
      if (!confirm(`Replace your current garden with this backup (${counts.beds} beds, ${counts.plantings} plantings)? A copy of your current garden will download first. Photos are kept.`)) return;
      downloadJson(await buildBackup(), `plotwise-before-import-${new Date().toISOString().slice(0, 10)}.json`);
      await restoreBackup(rows);
      await qc.invalidateQueries();
      toast.success("Backup imported");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <AppShell title="Settings" subtitle="Garden setup">
      <div className="mx-auto max-w-lg space-y-5">
        <Card className="space-y-3">
          <SectionLabel>Your garden</SectionLabel>
          <div><Label>Garden name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>USDA hardiness zone</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">{ZONE_KEYS.map((z) => <SelectItem key={z} value={z}>Zone {z.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Average last frost ~{fmt(f.last)}, first frost ~{fmt(f.first)}</p>
          </div>
          <Button className="w-full" onClick={() => profile.data && up.mutate({ id: profile.data.id, zone, garden_name: name } as never, { onSuccess: () => toast.success("Saved") })}>Save</Button>
        </Card>
        <Card className="space-y-3">
          <SectionLabel>Data</SectionLabel>
          <Button variant="outline" className="w-full" disabled={busy !== null} onClick={exportData}>{busy === "export" ? "Preparing..." : "Export garden (.json)"}</Button>
          <Button variant="outline" className="w-full" disabled={busy !== null} onClick={() => fileRef.current?.click()}>{busy === "import" ? "Importing..." : "Import garden from .json"}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importData(file); }} />
          <p className="text-xs text-muted-foreground">Backups include beds, blocked-off sections, plantings, notes, pests, plans and icons. Photos aren't included.</p>
          <Button variant="outline" className="w-full" onClick={async () => {
            try { await loadSampleGarden(); qc.invalidateQueries(); toast.success("Sample garden added"); } catch (e) { toast.error((e as Error).message); }
          }}>Add sample garden from sketch</Button>
          <Button variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</Button>
        </Card>
      </div>
    </AppShell>
  );
}
