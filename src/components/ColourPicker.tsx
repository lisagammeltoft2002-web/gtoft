"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PALETTE, livePalette, resetPicks, setPicks } from "./palette";

/* A small glass panel (dev only) for trying colours on the real page: the background, the sand and
   the glass. The ball, the sand in the air, the dunes, the paper, the text and every glass container
   follow live; the choice is remembered in this browser. "Copy values" puts the three colours on
   the clipboard, to make them the default. */
export function ColourPicker() {
  const [open, setOpen] = useState(true);
  const [paper, setPaper] = useState(DEFAULT_PALETTE().paper);
  const [ink, setInk] = useState(DEFAULT_PALETTE().ink);
  const [glass, setGlass] = useState("#ffffff");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = livePalette();
    setPaper(p.paper);
    setInk(p.ink);
    setGlass(p.glass ?? "#ffffff");
  }, []);

  const pick = (nextPaper: string, nextInk: string, nextGlass: string) => {
    setPaper(nextPaper);
    setInk(nextInk);
    setGlass(nextGlass);
    setPicks(nextPaper, nextInk, nextGlass);
  };

  const row = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex items-center justify-between gap-4">
      <span className="text-[0.85rem]">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[0.75rem] uppercase opacity-70">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-full border border-white/70 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
        />
      </span>
    </label>
  );

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass fixed bottom-4 right-4 z-50 flex h-11 items-center gap-2 rounded-full px-4 text-[0.85rem] focus-visible:ring-2 focus-visible:ring-moss"
      >
        <span className="h-4 w-4 rounded-full border border-white/70" style={{ background: paper }} />
        <span className="-ml-3 h-4 w-4 rounded-full border border-white/70" style={{ background: ink }} />
        Colours
      </button>
    );

  return (
    <div className="glass fixed bottom-4 right-4 z-50 w-[17rem] rounded-[22px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-heading text-[1.2rem]">Colours</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Hide the colour picker" className="h-8 w-8 rounded-full text-[1.1rem] leading-none hover:bg-white/40">
          ×
        </button>
      </div>
      <div className="space-y-3">
        {row("Background", paper, (v) => pick(v, ink, glass))}
        {row("Sand", ink, (v) => pick(paper, v, glass))}
        {row("Glass", glass, (v) => pick(paper, ink, v))}
      </div>
      <div className="mt-5 flex gap-2 text-[0.8rem]">
        <button
          type="button"
          onClick={() => {
            resetPicks();
            const p = DEFAULT_PALETTE();
            setPaper(p.paper);
            setInk(p.ink);
            setGlass(p.glass ?? "#ffffff");
          }}
          className="h-9 flex-1 rounded-full border border-moss/20 hover:bg-white/40"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(`background ${paper}, sand ${ink}, glass ${glass}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="h-9 flex-1 rounded-full bg-moss text-cream hover:opacity-85"
        >
          {copied ? "Copied" : "Copy values"}
        </button>
      </div>
    </div>
  );
}
