#!/usr/bin/env node
/**
 * POST enrichment rows to Platzi Fake Store; remove each row from results on success.
 * By default posts buyable products AND listingKind art_print rows. Use --buyable-only for products only.
 *
 *   node scripts/platzi-seed-from-enrichment.mjs --input data/picsum-enrichment.json --limit 5
 */

import { randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { platziPriceForRow, roundMoney } from './retail-price.mjs';

const BASE = 'https://api.escuelajs.co/api/v1';
const ALLOWED_SLUGS = new Set([
  'clothes',
  'electronics',
  'furniture',
  'shoes',
  'miscellaneous',
  'fashion',
]);

function parseArgs(argv) {
  const out = {
    input: resolve(process.cwd(), 'data/picsum-enrichment.json'),
    limit: Infinity,
    delayMs: 400,
    help: false,
    buyableOnly: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--buyable-only') out.buyableOnly = true;
    else if (a === '--input' || a === '-i') out.input = resolve(process.cwd(), argv[++i] || '');
    else if (a === '--limit' || a === '-n') out.limit = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (a === '--delay') out.delayMs = Math.max(0, parseInt(argv[++i], 10) || 0);
  }
  return out;
}

function atomicWriteJson(path, obj) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);
}

function loadState(path) {
  const raw = readFileSync(path, 'utf8');
  const j = JSON.parse(raw);
  return {
    lastIDProcessed: j.lastIDProcessed,
    lastRunStartedAt: j.lastRunStartedAt ?? null,
    lastRunFinishedAt: j.lastRunFinishedAt ?? null,
    results: Array.isArray(j.results) ? j.results : [],
  };
}

function normalizeCategorySlug(s) {
  const x = String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, '');
  if (ALLOWED_SLUGS.has(x)) return x;
  const map = {
    clothing: 'clothes',
    apparel: 'clothes',
    tech: 'electronics',
    gadget: 'electronics',
    shoe: 'shoes',
    sneaker: 'shoes',
    home: 'furniture',
    chair: 'furniture',
    accessory: 'fashion',
    accessories: 'fashion',
  };
  if (map[x]) return map[x];
  for (const slug of ALLOWED_SLUGS) {
    if (x.includes(slug) || slug.includes(x)) return slug;
  }
  return 'miscellaneous';
}

function deriveTitle(row) {
  if (row.listingKind === 'art_print' && row.printSize) {
    const t = (row.tags || []).slice(0, 2).join(', ');
    return `Art print ${row.printSize}${t ? ` — ${t}` : ''}`.slice(0, 120);
  }
  const tags = row.tags || [];
  const desc = (row.description || '').trim();
  if (tags.length) {
    const head = tags.slice(0, 2).join(', ');
    return (head + (desc ? ` — ${desc.slice(0, 50)}` : '')).slice(0, 120);
  }
  return (desc || `Listing ${row.picsumId}`).slice(0, 120);
}

function priceForSeedRow(row, categorySlug) {
  if (
    row.listingKind === 'art_print' &&
    typeof row.suggestedPriceUsd === 'number' &&
    Number.isFinite(row.suggestedPriceUsd) &&
    row.suggestedPriceUsd > 0
  ) {
    return roundMoney(row.suggestedPriceUsd);
  }
  return platziPriceForRow(row, categorySlug);
}

/**
 * Globally unique product slug every time (shared DB + re-runs + title-based slug rules).
 * Do not use only picsumId — prior seeds may already own dealhub-print-picsum-{id}.
 */
function newProductSlug(row) {
  const id = Number(row.picsumId);
  const safeId = Number.isFinite(id) ? String(Math.trunc(id)) : 'na';
  const kind = row.listingKind === 'art_print' ? 'print' : 'buyable';
  return `dh-${kind}-${safeId}-${randomBytes(5).toString('hex')}`;
}

function isSlugConstraintError(status, data) {
  if (status !== 400) return false;
  const blob = `${data?.message ?? ''} ${data?.code ?? ''} ${JSON.stringify(data ?? {})}`;
  return /slug|UNIQUE|SQLITE_CONSTRAINT_UNIQUE/i.test(blob);
}

async function fetchCategories() {
  const res = await fetch(`${BASE}/categories`);
  if (!res.ok) throw new Error(`GET categories ${res.status}`);
  return res.json();
}

async function postProduct(body) {
  const res = await fetch(`${BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`platzi-seed-from-enrichment.mjs
  --input, -i   Enrichment JSON (default data/picsum-enrichment.json)
  --limit, -n   Max products to POST this run (default: all matching rows)
  --delay       Ms between POSTs (default 400)
  --buyable-only  Only POST buyable: true (skip art_print rows)
`);
    process.exit(0);
  }
  if (!existsSync(args.input)) {
    console.error('Missing input file:', args.input);
    process.exit(1);
  }

  const state = loadState(args.input);
  const slugToId = new Map();
  for (const c of await fetchCategories()) {
    if (c?.slug && ALLOWED_SLUGS.has(c.slug)) slugToId.set(c.slug, c.id);
  }
  for (const slug of ALLOWED_SLUGS) {
    if (!slugToId.has(slug)) {
      console.warn('Warning: no Platzi category for slug', slug);
    }
  }

  const buyablePending = state.results.filter((r) => r && r.buyable === true);
  const artPrintPending = state.results.filter(
    (r) => r && r.buyable === false && r.listingKind === 'art_print',
  );
  const pending = state.results.filter((r) => {
    if (!r) return false;
    if (r.buyable === true) return true;
    if (!args.buyableOnly && r.listingKind === 'art_print') return true;
    return false;
  });

  let posted = 0;
  let failed = 0;
  const errors = [];

  for (const row of pending) {
    if (posted >= args.limit) break;
    const categorySlug = normalizeCategorySlug(
      row.listingKind === 'art_print' ? 'miscellaneous' : row.suggestedCategory,
    );
    const categoryId = slugToId.get(categorySlug) ?? slugToId.get('miscellaneous');
    if (categoryId == null) {
      failed++;
      errors.push({ picsumId: row.picsumId, error: 'no categoryId for ' + categorySlug });
      continue;
    }

    const baseTitle = deriveTitle(row);
    const title = `${baseTitle} ·#${row.picsumId}`.slice(0, 120);
    const description = (row.description || baseTitle).slice(0, 2000);
    const price = priceForSeedRow(row, categorySlug);
    const images = [row.imageUrl].filter(Boolean);
    if (!images.length) {
      failed++;
      errors.push({ picsumId: row.picsumId, error: 'missing imageUrl' });
      continue;
    }

    let productSlug = newProductSlug(row);
    let lastRes = { ok: false, status: 0, data: {} };
    for (let attempt = 0; attempt < 4; attempt++) {
      lastRes = await postProduct({
        title,
        slug: productSlug,
        price,
        description,
        categoryId,
        images,
      });
      if (lastRes.ok) break;
      if (attempt < 3 && isSlugConstraintError(lastRes.status, lastRes.data)) {
        productSlug = newProductSlug(row);
        await sleep(args.delayMs);
        continue;
      }
      break;
    }

    const { ok, status, data } = lastRes;

    if (!ok) {
      failed++;
      errors.push({ picsumId: row.picsumId, status, data });
      await sleep(args.delayMs);
      continue;
    }

    state.results = state.results.filter((r) => r.picsumId !== row.picsumId);
    atomicWriteJson(args.input, state);
    posted++;
    await sleep(args.delayMs);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        input: args.input,
        buyableOnly: args.buyableOnly,
        posted,
        failed,
        remainingBuyable: state.results.filter((r) => r?.buyable === true).length,
        remainingArtPrints: state.results.filter(
          (r) => r?.buyable === false && r?.listingKind === 'art_print',
        ).length,
        queuedBeforeRun: {
          buyable: buyablePending.length,
          artPrints: artPrintPending.length,
          combined: pending.length,
        },
        hint:
          args.buyableOnly && buyablePending.length === 0 && artPrintPending.length > 0
            ? 'No buyable rows queued; omit --buyable-only to POST art_print rows.'
            : undefined,
        lastIDProcessedUnchanged: state.lastIDProcessed,
        errors: errors.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
