import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudRain, Droplets, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtY } from "@/lib/zones";

type Loc = { lat: number; lon: number; name: string };
const KEY = "plotwise:weatherLoc";

const CODES: Record<number, [string, string]> = {
  0: ["☀️", "Clear"], 1: ["🌤️", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Cloudy"], 45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"],
  51: ["🌦️", "Drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌦️", "Drizzle"], 61: ["🌧️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Snow"], 73: ["🌨️", "Snow"], 75: ["🌨️", "Snow"], 80: ["🌦️", "Showers"], 81: ["🌧️", "Showers"], 82: ["⛈️", "Heavy showers"], 95: ["⛈️", "Thunderstorms"], 96: ["⛈️", "Thunderstorms"], 99: ["⛈️", "Thunderstorms"],
};

/** Today's forecast with a simple water / skip-watering call. Uses Open-Meteo (free, no key). */
export function WeatherToday() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [ready, setReady] = useState(false);
  const [zip, setZip] = useState("");
  const [finding, setFinding] = useState(false);
  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setLoc(JSON.parse(s)); } catch { /* ignore */ } setReady(true); }, []);
  const save = (l: Loc) => { localStorage.setItem(KEY, JSON.stringify(l)); setLoc(l); };

  const wx = useQuery({
    queryKey: ["weather", loc?.lat, loc?.lon],
    enabled: !!loc,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc!.lat}&longitude=${loc!.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&past_days=1&forecast_days=2`;
      const r = await fetch(u);
      if (!r.ok) throw new Error("Weather unavailable");
      const d = (await r.json()).daily;
      return { code: d.weather_code[1], hi: d.temperature_2m_max[1], lo: d.temperature_2m_min[1], rain: d.precipitation_sum[1], prob: d.precipitation_probability_max[1], yRain: d.precipitation_sum[0], tRain: d.precipitation_sum[2] };
    },
  });

  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");
  const done = (l: Loc) => { save(l); setEditing(false); setErr(""); setZip(""); };
  const useGps = () => {
    if (!navigator.geolocation) { setErr("Location isn't available on this device - enter a ZIP instead."); return; }
    setFinding(true); setErr("");
    navigator.geolocation.getCurrentPosition(
      (p) => { done({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), name: "Your location" }); setFinding(false); },
      () => { setFinding(false); setErr("Couldn't get your location - enter a ZIP or town instead."); },
      { timeout: 10000 },
    );
  };
  const useZip = async () => {
    const q = zip.trim();
    if (!q) return;
    setFinding(true); setErr("");
    try {
      if (/^\d{5}$/.test(q)) {
        const r = await fetch(`https://api.zippopotam.us/us/${q}`);
        if (r.ok) {
          const pl = (await r.json()).places?.[0];
          if (pl) return done({ lat: +pl.latitude, lon: +pl.longitude, name: `${pl["place name"]}, ${pl["state abbreviation"]}` });
        }
      }
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.split(",")[0]!.trim())}&count=1&countryCode=US`);
      const g = (await r.json()).results?.[0];
      if (g) done({ lat: g.latitude, lon: g.longitude, name: `${g.name}${g.admin1 ? `, ${g.admin1}` : ""}` });
      else setErr("Couldn't find that place - try a 5-digit ZIP.");
    } catch { setErr("Couldn't look that up - try again."); }
    finally { setFinding(false); }
  };

  const date = fmtY(new Date());
  if (!ready) return null;
  if (!loc || editing) return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm">
      <div className="text-sm font-semibold">{date}</div>
      <p className="mt-1 text-sm text-muted-foreground">{loc ? `Current location: ${loc.name}` : "Add your location to see today's rain and whether to water."}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={useGps} disabled={finding}>{finding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MapPin className="mr-1 h-4 w-4" />}Use my location</Button>
        <Input value={zip} onChange={(e) => setZip(e.target.value)} onKeyDown={(e) => e.key === "Enter" && useZip()} placeholder="or ZIP / town" className="h-9 w-36" />
        <Button size="sm" variant="outline" onClick={useZip} disabled={finding || !zip.trim()}>Save</Button>
        {loc && <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setErr(""); }}>Cancel</Button>}
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );

  const w = wx.data;
  const [icon, label] = w ? CODES[w.code] ?? ["🌡️", "—"] : ["", ""];
  const tip = !w ? null
    : w.rain >= 0.25 || w.prob >= 60 ? { t: `Skip watering - about ${w.rain.toFixed(2)} in of rain expected`, rain: true }
    : w.yRain >= 0.5 ? { t: `Soil should still be moist after ${w.yRain.toFixed(2)} in yesterday`, rain: true }
    : w.hi >= 85 ? { t: "Hot and dry: water deeply this morning", rain: false }
    : w.tRain >= 0.25 ? { t: `Rain likely tomorrow (${w.tRain.toFixed(2)} in) - water only thirsty plants`, rain: true }
    : { t: "Dry day: water if the top inch of soil is dry", rain: false };

  return (
    <div className="flex items-center gap-4 rounded-3xl border bg-card p-4 shadow-sm">
      <div className="text-4xl leading-none">{icon || "…"}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm"><span className="font-semibold">{date}</span>
          <button className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline underline-offset-2" onClick={() => setEditing(true)}><MapPin className="h-3 w-3" />{loc.name} · Edit</button></div>
        {wx.isError ? <p className="text-sm text-muted-foreground">Weather unavailable right now.</p> : !w ? <p className="text-sm text-muted-foreground">Loading forecast...</p> : (
          <>
            <div className="text-sm">{label} · {Math.round(w.hi)}° / {Math.round(w.lo)}° · <CloudRain className="inline h-3.5 w-3.5" /> {w.prob ?? 0}%</div>
            <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${tip!.rain ? "text-primary" : "text-foreground"}`}><Droplets className="h-4 w-4 shrink-0" />{tip!.t}</div>
            {w.lo <= 34 && <div className="mt-1 text-sm font-semibold text-destructive">Frost risk tonight - cover tender plants</div>}
          </>
        )}
      </div>
    </div>
  );
}
