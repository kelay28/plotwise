import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CROPS, getCrop } from "@/lib/crops";
import { lookupVariety } from "@/lib/ai.functions";
import { useUserVarieties, useZone } from "@/lib/garden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlantIcon } from "./PlantIcon";

export type PlantChoice = { crop_slug: string; variety: string | null; color: string | null; days_to_maturity: number | null; planted_on: string | null; method: string; stage: string };

export function PlantPicker({ onSave, saving }: { onSave: (c: PlantChoice) => void; saving?: boolean }) {
  const zone = useZone();
  const uv = useUserVarieties();
  const qc = useQueryClient();
  const lookup = useServerFn(lookupVariety);
  const [slug, setSlug] = useState("tomato");
  const [variety, setVariety] = useState<string>("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("transplant");
  const [stage, setStage] = useState("seedling");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const crop = getCrop(slug);
  const [open, setOpen] = useState(false);
  const mine = (uv.data ?? []).filter((v) => v.crop_slug === slug);
  const options = [
    ...crop.varieties.map((v) => ({ name: v.name, color: v.color, days: v.days ?? null, ai: false })),
    ...mine.map((v) => ({ name: v.name, color: v.color, days: v.days_to_maturity, ai: true })),
  ];
  const sel = options.find((o) => o.name === variety);

  async function ai() {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const row = await lookup({ data: { query: q.trim(), zone } });
      await qc.invalidateQueries({ queryKey: ["varieties"] });
      if (row.crop_slug !== "other") setSlug(row.crop_slug);
      setVariety(row.name);
      toast.success(`Found ${row.name}`, { description: "AI-sourced, please verify." });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary p-3">
        <Label className="text-xs">Know the exact seed? Look it up</Label>
        <div className="mt-1 flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder='e.g. "Black Krim tomato"' onKeyDown={(e) => e.key === "Enter" && ai()} />
          <Button variant="outline" onClick={ai} disabled={busy}><Sparkles className="mr-1 h-4 w-4" />{busy ? "Looking..." : "Look up"}</Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <PlantIcon slug={slug} color={sel?.color ?? null} size={48} />
        <div className="flex-1">
          <Label>Plant</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">{crop.emoji} {crop.name}<ChevronsUpDown className="h-4 w-4 opacity-50" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Type a plant, e.g. cauliflower" />
                <CommandList className="max-h-72">
                  <CommandEmpty>No match - try the seed look-up above.</CommandEmpty>
                  <CommandGroup>
                    {CROPS.map((c) => <CommandItem key={c.slug} value={c.name} onSelect={() => { setSlug(c.slug); setVariety(""); setOpen(false); }}>{c.emoji} {c.name}</CommandItem>)}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div>
        <Label>Variety (optional)</Label>
        <Select value={variety || "__none"} onValueChange={(v) => setVariety(v === "__none" ? "" : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Not sure / generic</SelectItem>
            {options.map((o) => <SelectItem key={o.name} value={o.name}>{o.name}{o.ai ? " (AI)" : ""}{o.days ? ` - ${o.days}d` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Planted on</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label>Started as</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="transplant">Transplant</SelectItem><SelectItem value="seed">Direct seed</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Current status</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="seedling">Seedling</SelectItem>
            <SelectItem value="young">Young plant</SelectItem>
            <SelectItem value="mature">Mature / ready to harvest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!date && <p className="text-xs text-muted-foreground">No date? We'll use the typical planting time for your zone to estimate harvest.</p>}
      <Button className="w-full" disabled={saving} onClick={() => onSave({ crop_slug: slug, variety: variety || null, color: sel?.color ?? null, days_to_maturity: sel?.days ?? null, planted_on: date || null, method, stage })}>
        Place plant
      </Button>
    </div>
  );
}
