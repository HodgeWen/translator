import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { isValidHexColor } from '@/entrypoints/content/input-translate-utils';

interface HsvaColor {
  h: number;
  s: number;
  v: number;
  a: number;
}

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ColorPaletteInputProps {
  value: string;
  onPreview?: (value: string) => void;
  onCommit: (value: string) => void;
  label: string;
  invalidText: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function expandHex(hex: string): string | null {
  const raw = hex.trim().replace(/^#/, '');
  if (![3, 4, 6, 8].includes(raw.length) || !/^[0-9a-fA-F]+$/.test(raw)) return null;
  if (raw.length === 3 || raw.length === 4) {
    return raw.split('').map((ch) => ch + ch).join('');
  }
  return raw;
}

function hexToRgba(hex: string): RgbaColor | null {
  const expanded = expandHex(hex);
  if (!expanded) return null;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const alpha = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a: alpha };
}

function rgbaToHsva({ r, g, b, a }: RgbaColor): HsvaColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max, a };
}

function hsvaToRgba({ h, s, v, a }: HsvaColor): RgbaColor {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
    a,
  };
}

function byteToHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

function rgbaToHex({ r, g, b, a }: RgbaColor): string {
  const alpha = clamp(a, 0, 1);
  const base = `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
  return alpha >= 0.995 ? base : `${base}${byteToHex(alpha * 255)}`;
}

function colorToHsva(value: string): HsvaColor {
  return rgbaToHsva(hexToRgba(value) ?? { r: 37, g: 99, b: 235, a: 1 });
}

function emitColor(
  next: HsvaColor,
  callback: ((value: string) => void) | undefined
): string {
  const hex = rgbaToHex(hsvaToRgba(next));
  callback?.(hex);
  return hex;
}

export function ColorPaletteInput({ value, onPreview, onCommit, label, invalidText }: ColorPaletteInputProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [hsva, setHsva] = useState<HsvaColor>(() => colorToHsva(value));
  const areaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
    setHsva(colorToHsva(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [open]);

  const valid = isValidHexColor(draft);
  const rgba = hsvaToRgba(hsva);
  const solidColor = rgbaToHex({ ...rgba, a: 1 });
  const currentColor = rgbaToHex(rgba);

  const updateAreaColor = (clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = {
      ...hsva,
      s: clamp((clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((clientY - rect.top) / rect.height, 0, 1),
    };
    setHsva(next);
    setDraft(rgbaToHex(hsvaToRgba(next)));
    emitColor(next, onPreview);
  };

  const startAreaDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateAreaColor(event.clientX, event.clientY);
  };

  const handleManualChange = (next: string) => {
    setDraft(next);
    if (!isValidHexColor(next)) return;
    const parsed = colorToHsva(next);
    setHsva(parsed);
    onPreview?.(rgbaToHex(hsvaToRgba(parsed)));
  };

  const handleHueChange = (nextHue: number) => {
    const next = { ...hsva, h: nextHue };
    setHsva(next);
    setDraft(rgbaToHex(hsvaToRgba(next)));
    emitColor(next, onPreview);
  };

  const handleAlphaChange = (nextAlpha: number) => {
    const next = { ...hsva, a: nextAlpha };
    setHsva(next);
    setDraft(rgbaToHex(hsvaToRgba(next)));
    emitColor(next, onPreview);
  };

  const commitCurrent = () => {
    if (!valid) return;
    onCommit(currentColor);
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-transparent px-2 text-left text-sm hover:bg-accent/50"
      >
        <span
          className="h-8 w-8 shrink-0 rounded-md border border-border"
          style={{
            backgroundColor: currentColor,
            backgroundImage:
              'linear-gradient(45deg, rgba(148,163,184,.35) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,.35) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,.35) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,.35) 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
          }}
        />
        <span className="font-mono text-xs">{currentColor}</span>
      </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-md border border-border bg-popover p-3 shadow-lg">
          <div
            ref={areaRef}
            className="relative h-32 cursor-crosshair rounded-md border border-border"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsva.h} 100% 50%))`,
            }}
            onPointerDown={startAreaDrag}
            onPointerMove={(event) => {
              if (event.buttons === 1) updateAreaColor(event.clientX, event.clientY);
            }}
            onPointerUp={commitCurrent}
            onPointerCancel={commitCurrent}
          >
            <span
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-md border border-border"
              style={{
                backgroundColor: currentColor,
                backgroundImage:
                  'linear-gradient(45deg, rgba(148,163,184,.35) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,.35) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,.35) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,.35) 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
              }}
            />
        <input
          type="text"
          value={draft}
          onChange={(e) => handleManualChange(e.target.value)}
              onBlur={commitCurrent}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCurrent();
              }}
          spellCheck={false}
          className={cn(
            'h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-xs font-mono',
            valid ? 'border-input' : 'border-destructive text-destructive'
          )}
        />
          </div>

          <div className="mt-3 space-y-2">
            <input
              type="range"
              min={0}
              max={360}
              value={Math.round(hsva.h)}
              onChange={(e) => handleHueChange(Number(e.target.value))}
              onPointerUp={commitCurrent}
              onBlur={commitCurrent}
              className="h-2 w-full appearance-none rounded-full accent-primary"
              style={{
                background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsva.a * 100)}
              onChange={(e) => handleAlphaChange(Number(e.target.value) / 100)}
              onPointerUp={commitCurrent}
              onBlur={commitCurrent}
              className="h-2 w-full appearance-none rounded-full accent-primary"
              style={{
                backgroundImage: `linear-gradient(to right, transparent, ${solidColor}), linear-gradient(45deg, rgba(148,163,184,.45) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,.45) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,.45) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,.45) 75%)`,
                backgroundSize: '100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
                backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0',
              }}
            />
          </div>

          {!valid && <p className="mt-2 text-xs text-destructive">{invalidText}</p>}
        </div>
      )}
    </div>
  );
}
