import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plotwise - Map and track your garden" },
      { name: "description", content: "Draw your yard, place plants in beds, and track planting, harvest dates and pests for your hardiness zone." },
      { property: "og:title", content: "Plotwise - Map and track your garden" },
      { property: "og:description", content: "Draw your yard, place plants in beds, and track harvests and pests by zone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const features = [
  ["🗺️", "Map your yard", "Beds to real size in feet. Arrange far-apart plots side by side."],
  ["🍅", "Plant icons", "Tap a square and drop in a plant. Varieties get their own color."],
  ["📅", "Harvest dates", "Log planting dates and get harvest estimates for your zone."],
  ["🐛", "Pest help", "Log pests and get treatments, like Bt every 7 days for caterpillars."],
];

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);
  return (
    <div className="min-h-screen bg-ink text-ink-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Plotwise</p>
        <h1 className="mt-4 text-5xl font-bold leading-tight md:text-6xl">Your whole garden,<br />at a glance.</h1>
        <p className="mt-5 max-w-xl text-lg opacity-75">Map your raised beds, place your plants, and know when to plant, prune, water, treat pests and harvest, based on your zone.</p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg" className="rounded-full"><Link to="/auth">Get started</Link></Button>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {features.map(([e, t, d]) => (
            <div key={t} className="rounded-3xl bg-card p-5 text-card-foreground">
              <div className="text-3xl">{e}</div>
              <h3 className="mt-3 text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
