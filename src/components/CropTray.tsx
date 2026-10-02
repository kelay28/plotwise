import { useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PlantIcon } from "@/components/PlantIcon";
import { CROPS, getCrop } from "@/lib/crops";
import { cn } from "@/lib/utils";

/** Pick a crop "brush", then drag across bed squares to plant it. */
export function CropTray({ value, onChange, recent }: { value: string | null; onChange: (slug: string | null) => void; recent: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/60 p-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-44 justify-between bg-card font-normal">
            {value ? <span className="flex items-center gap-1.5"><PlantIcon slug={value} size={18} />{getCrop(value).name}</span> : "Pick a crop to plant"}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Type a plant..." />
            <CommandList className="max-h-72">
              <CommandEmpty>No match.</CommandEmpty>
              <CommandGroup>
                {CROPS.map((c) => <CommandItem key={c.slug} value={c.name} onSelect={() => { onChange(c.slug); setOpen(false); }}>{c.emoji} {c.name}</CommandItem>)}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {recent.map((slug) => (
        <button key={slug} type="button" onClick={() => onChange(value === slug ? null : slug)} title={getCrop(slug).name}
          className={cn("flex items-center gap-1 rounded-full border-2 bg-card px-2 py-0.5 text-xs font-medium", value === slug ? "border-primary" : "border-transparent hover:border-primary/50")}>
          <PlantIcon slug={slug} size={18} />{getCrop(slug).name}
        </button>
      ))}
      {value && <Button size="sm" variant="ghost" onClick={() => onChange(null)}><X className="mr-1 h-3 w-3" />Stop planting</Button>}
    </div>
  );
}
