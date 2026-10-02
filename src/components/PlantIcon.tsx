import { getCrop } from "@/lib/crops";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** User's saved default picture per crop (slug -> icon). */
export const useCropIcons = () =>
  useQuery({ queryKey: ["crop_icons"], staleTime: 60_000, queryFn: async () => {
    const { data } = await supabase.from("crop_icons" as never).select("crop_slug, icon");
    return Object.fromEntries(((data ?? []) as { crop_slug: string; icon: string }[]).map((r) => [r.crop_slug, r.icon])) as Record<string, string>;
  } });

/**
 * Plant marker: the crop emoji sitting on a small soil mound tinted by the variety
 * color (e.g. Black Krim's mound reads darker than Cherry's). No clipping circle.
 */
export function PlantIcon({ slug, color, icon, size = 32, className }: { slug: string; color?: string | null; icon?: string | null; size?: number; className?: string | undefined }) {
  const crop = getCrop(slug);
  const tint = color || crop.color;
  const saved = useCropIcons().data?.[slug];
  icon = icon || saved;
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-end justify-center", className)}
      style={{ width: size, height: size }}
      title={crop.name}
    >
      <span
        aria-hidden
        className="absolute bottom-[4%] left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          width: "82%", height: "30%",
          background: `radial-gradient(ellipse at 50% 40%, color-mix(in oklab, ${tint} 70%, white), ${tint})`,
          boxShadow: `0 1px 2px color-mix(in oklab, ${tint} 50%, transparent)`,
        }}
      />
      <span className="relative leading-none" style={{ fontSize: size * 0.72, marginBottom: size * 0.1, filter: "drop-shadow(0 1px 1px rgb(0 0 0 / 0.18))" }}>
        {icon?.startsWith("data:") || icon?.startsWith("http")
          ? <img src={icon} alt="" className="block object-contain" style={{ width: size * 0.78, height: size * 0.78 }} />
          : icon || crop.emoji}
      </span>
    </span>
  );
}
