"use client";

import { useEffect, useState } from "react";

/* Where Lisa is right now: her role, that she's open to roles, and Stockholm's own time,
   with a small sun travelling its arc between today's real sunrise and sunset there (a
   thin moon after dark). Calm: it only changes once a minute. */

const LAT = 59.33, LON = 18.07;
const RAD = Math.PI / 180;

/* the sun in Stockholm at a moment: how far through the day or night (0 → 1), and today's
   sunrise and sunset in local hours (a plain solar estimate, good to a few minutes) */
function sun(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10)) * RAD;
  const half = Math.acos(Math.max(-1, Math.min(1, -Math.tan(LAT * RAD) * Math.tan(decl)))) / RAD / 15; // hours from noon to sunset
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const solar = (utcHours + LON / 15 + 24) % 24; // local solar time
  const rise = 12 - half, set = 12 + half;
  const isDay = solar >= rise && solar <= set;
  const share = isDay ? (solar - rise) / (set - rise) : (((solar - set + 24) % 24) / (24 - (set - rise)));
  // solar hours back to Stockholm clock time (Intl knows about summer time)
  const fmt = (hrs: number) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) + (hrs - LON / 15) * 3600000);
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }).format(d);
  };
  return { isDay, share, rise: fmt(rise), set: fmt(set) };
}

export function NowTile({ role, open, place }: { role: string; open: string; place: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const time = now ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }).format(now) : "--:--";
  const s = now ? sun(now) : { isDay: true, share: 0.5, rise: "", set: "" };
  // the arc: a half ellipse over the horizon line
  const cx = 80, cy = 70, rx = 56, ry = 38;
  const a = Math.PI * (1 - s.share);
  const px = cx + rx * Math.cos(a), py = cy - ry * Math.sin(a);

  return (
    <div className="absolute inset-0 flex flex-col">
      <p className="t-title m-0">{role}</p>
      <p className="t-body mt-2 mb-0 opacity-90">{open}</p>
      <svg viewBox="0 0 160 96" className="mt-auto w-full" role="img" aria-label={`${s.isDay ? "Daytime" : "Night"} in Stockholm, ${time}`}>
        <path d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 2.2" />
        <line x1="8" y1={cy} x2="152" y2={cy} stroke="currentColor" strokeWidth="0.6" />
        {s.isDay ? (
          <g>
            <circle cx={px} cy={py} r="5" fill="currentColor" />
            <circle cx={px} cy={py} r="8.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="now-glow" />
          </g>
        ) : (
          // a thin moon: a dot with a paper bite out of it
          <g>
            <circle cx={px} cy={py} r="5" fill="currentColor" />
            <circle cx={px + 2.4} cy={py - 1.6} r="4.4" fill="var(--leaf)" />
          </g>
        )}
        <text x={cx - rx} y={cy + 11} textAnchor="middle" fontSize="8" fill="currentColor">
          {s.rise}
        </text>
        <text x={cx + rx} y={cy + 11} textAnchor="middle" fontSize="8" fill="currentColor">
          {s.set}
        </text>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fill="currentColor" className="tabular-nums">
          {time}
        </text>
        <text x={cx} y={cy + 21} textAnchor="middle" fontSize="8" fill="currentColor">
          {place}
        </text>
      </svg>
    </div>
  );
}
