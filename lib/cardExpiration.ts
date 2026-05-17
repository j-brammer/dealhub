export type CardExpSelectItem = { value: string; label: string; detail?: string };

/** Parse stored `MM/YY`, optional partial `MM/` or `/YY` while picking. */
export function parseExpiration(raw: string): { month: string; year: string } {
  const s = raw.trim();
  if (!s) return { month: '', year: '' };

  const parts = s.split('/');
  const p0 = (parts[0] ?? '').trim();
  const p1 = (parts[1] ?? '').trim();

  let month = '';
  let year = '';

  if (p0 && parts.length >= 2 && !p1) {
    const n = parseInt(p0, 10);
    if (n >= 1 && n <= 12) month = String(n).padStart(2, '0');
    return { month, year: '' };
  }

  if (!p0 && p1) {
    let y = p1;
    if (y.length === 4) y = y.slice(-2);
    if (/^\d{2}$/.test(y)) year = y;
    return { month: '', year };
  }

  if (p0) {
    const n = parseInt(p0, 10);
    if (n >= 1 && n <= 12) month = String(n).padStart(2, '0');
  }
  if (p1) {
    let y = p1;
    if (y.length === 4) y = y.slice(-2);
    if (/^\d{2}$/.test(y)) year = y;
  }

  return { month, year };
}

export function encodeExpiration(month: string, year: string): string {
  if (month && year) return `${month}/${year}`;
  if (month) return `${month}/`;
  if (year) return `/${year}`;
  return '';
}

export function cardExpYearItems(): CardExpSelectItem[] {
  const y0 = new Date().getFullYear();
  const out: CardExpSelectItem[] = [];
  for (let i = 0; i < 16; i++) {
    const full = y0 + i;
    const yy = String(full % 100).padStart(2, '0');
    out.push({ value: yy, label: String(full), detail: yy });
  }
  return out;
}

function fullYearFromTwoDigit(yy: string): number {
  const n = parseInt(yy, 10);
  if (Number.isNaN(n)) return new Date().getFullYear();
  return 2000 + n;
}

/** Months still valid for the chosen 2-digit expiry year (same rules as real cards). */
export function cardExpMonthItems(twoDigitYear: string): CardExpSelectItem[] {
  if (!twoDigitYear || !/^\d{2}$/.test(twoDigitYear)) {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const v = String(m).padStart(2, '0');
      return { value: v, label: v };
    });
  }

  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;
  const fy = fullYearFromTwoDigit(twoDigitYear);
  const start = fy === yNow ? mNow : 1;
  const out: CardExpSelectItem[] = [];
  for (let m = start; m <= 12; m++) {
    const v = String(m).padStart(2, '0');
    out.push({ value: v, label: v });
  }
  return out;
}

export function isCompleteExpiration(raw: string): boolean {
  const { month, year } = parseExpiration(raw);
  return Boolean(month && year);
}
