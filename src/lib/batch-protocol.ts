export interface BatchItem {
  id: number;
  text: string;
}

export interface DecodedBatch {
  translations: Map<number, string>;
  missing: number[];
  duplicated: number[];
}

const MARKER_RE = /^<<<(\d+)>>>\s*$/gm;

export function encodeBatch(items: BatchItem[]): string {
  return items.map(({ id, text }) => `<<<${id}>>>\n${text}`).join('\n');
}

export function decodeBatch(raw: string, expected: number): DecodedBatch {
  type Marker = { id: number; start: number; end: number };
  const markers: Marker[] = [];

  MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKER_RE.exec(raw)) !== null) {
    markers.push({
      id: Number(m[1]),
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  const translations = new Map<number, string>();
  const counts = new Map<number, number>();

  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const next = markers[i + 1];
    const segment = raw.slice(cur.end, next ? next.start : raw.length).trim();
    translations.set(cur.id, segment);
    counts.set(cur.id, (counts.get(cur.id) ?? 0) + 1);
  }

  const missing: number[] = [];
  for (let id = 1; id <= expected; id++) {
    if (!translations.has(id)) missing.push(id);
  }

  const duplicated: number[] = [];
  for (const [id, count] of counts) {
    if (count > 1) duplicated.push(id);
  }
  duplicated.sort((a, b) => a - b);

  return { translations, missing, duplicated };
}
