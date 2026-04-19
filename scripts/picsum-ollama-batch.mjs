#!/usr/bin/env node
/**
 * Sequential Picsum id scanner with Ollama vision: buyable gate + metadata.
 * Checkpoint file: lastIDProcessed (cursor) + results[] — rewritten after each successful id.
 * Picsum HTTP 404: skip id, advance lastIDProcessed, continue (no result row).
 * Other fetch/Ollama/JSON errors: stderr + exit 1 (cursor unchanged for that id).
 *
 * Usage:
 *   node scripts/picsum-ollama-batch.mjs --output data/picsum-enrichment.json --count 10
 *   node scripts/picsum-ollama-batch.mjs 10   # shorthand: count only
 *   OLLAMA_HOST=http://127.0.0.1:11434 OLLAMA_MODEL=qwen2.5vl:7b node scripts/picsum-ollama-batch.mjs --count 5
 *
 * Options: --output, --count, --start-id, --width, --height, --model, --host, --no-auto-pull
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  CATEGORY_PRICE_BOUNDS_USD,
  finalizeRetailUsd,
  randomArtPrintRetailUsd,
  rawPriceCandidate,
} from './retail-price.mjs';

const ALLOWED_CATEGORIES = [
  'clothes',
  'electronics',
  'furniture',
  'shoes',
  'miscellaneous',
  'fashion',
];

function parseArgs(argv) {
  const out = {
    output: resolve(process.cwd(), 'data/picsum-enrichment.json'),
    count: null,
    startId: null,
    width: 512,
    height: 512,
    model: process.env.OLLAMA_MODEL || 'qwen2.5vl:7b',
    host: (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, ''),
    help: false,
    noAutoPull: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--no-auto-pull') out.noAutoPull = true;
    else if (a === '--output' || a === '-o') out.output = resolve(process.cwd(), argv[++i] || '');
    else if (a === '--count' || a === '-n') out.count = Math.max(1, parseInt(argv[++i], 10) || 0);
    else if (a === '--start-id') out.startId = parseInt(argv[++i], 10);
    else if (a === '--width') out.width = parseInt(argv[++i], 10) || 512;
    else if (a === '--height') out.height = parseInt(argv[++i], 10) || 512;
    else if (a === '--model' || a === '-m') out.model = argv[++i] || out.model;
    else if (a === '--host') out.host = (argv[++i] || out.host).replace(/\/$/, '');
  }
  if (out.count == null) {
    for (let i = 2; i < argv.length; i++) {
      const a = argv[i];
      if (typeof a !== 'string' || a.startsWith('-')) continue;
      const n = parseInt(a, 10);
      if (n >= 1 && String(n) === a.trim()) {
        out.count = n;
        break;
      }
    }
  }
  return out;
}

function printHelp() {
  console.log(`picsum-ollama-batch.mjs

Walk Lorem Picsum ids sequentially; for each image run Ollama (buyable gate, then metadata).

  --output, -o   JSON checkpoint path (default: data/picsum-enrichment.json)
  --count, -n    How many Picsum ids to process this run (required unless you pass one positive integer, e.g. … 10)
  --start-id     Next id to scan (overrides resume from lastIDProcessed + 1)
  --width        Image width for Picsum URL (default 512)
  --height       Image height for Picsum URL (default 512)
  --model, -m    Ollama model (env OLLAMA_MODEL, default qwen2.5vl:7b)
  --host         Ollama base URL (env OLLAMA_HOST, default http://127.0.0.1:11434)
  --no-auto-pull Skip automatic "ollama pull" when the model is missing (env OLLAMA_NO_AUTO_PULL=1)

Resume: reads lastIDProcessed from --output; next id = lastIDProcessed + 1 unless --start-id is set.
If the model is not local, the script calls Ollama's HTTP /api/pull once then retries the chat.
`);
}

function loadState(path) {
  if (!existsSync(path)) {
    return {
      lastIDProcessed: -1,
      lastRunStartedAt: null,
      lastRunFinishedAt: null,
      results: [],
    };
  }
  try {
    const raw = readFileSync(path, 'utf8');
    const j = JSON.parse(raw);
    return {
      lastIDProcessed: Number.isFinite(j.lastIDProcessed) ? j.lastIDProcessed : -1,
      lastRunStartedAt: j.lastRunStartedAt ?? null,
      lastRunFinishedAt: j.lastRunFinishedAt ?? null,
      results: Array.isArray(j.results) ? j.results : [],
    };
  } catch {
    console.error('Warning: could not parse existing output file; starting fresh.');
    return {
      lastIDProcessed: -1,
      lastRunStartedAt: null,
      lastRunFinishedAt: null,
      results: [],
    };
  }
}

function atomicWriteJson(path, obj) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  renameSync(tmp, path);
}

function extractJsonObject(text) {
  const t = String(text || '').trim();
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let v = tryParse(t);
  if (v && typeof v === 'object') return v;
  const start = t.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        v = tryParse(t.slice(start, i + 1));
        if (v && typeof v === 'object') return v;
      }
    }
  }
  return null;
}

function normalizeSuggestedCategory(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, '');
  const aliases = {
    clothing: 'clothes',
    apparel: 'clothes',
    garment: 'clothes',
    tech: 'electronics',
    gadget: 'electronics',
    computer: 'electronics',
    phone: 'electronics',
    shoe: 'shoes',
    sneaker: 'shoes',
    boot: 'shoes',
    home: 'furniture',
    chair: 'furniture',
    table: 'furniture',
    decor: 'furniture',
    accessory: 'fashion',
    accessories: 'fashion',
    jewelry: 'fashion',
    other: 'miscellaneous',
    general: 'miscellaneous',
  };
  if (ALLOWED_CATEGORIES.includes(s)) return s;
  if (aliases[s]) return aliases[s];
  for (const c of ALLOWED_CATEGORIES) {
    if (s.includes(c) || c.includes(s)) return c;
  }
  return 'miscellaneous';
}

async function fetchPicsumBuffer(id, width, height) {
  const url = `https://picsum.photos/id/${id}/${width}/${height}`;
  const res = await fetch(url, { redirect: 'follow' });
  const finalUrl = res.url || url;
  if (!res.ok) {
    return { ok: false, status: res.status, error: `HTTP ${res.status}`, url: finalUrl };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) {
    return { ok: false, status: res.status, error: 'empty body', url: finalUrl };
  }
  return { ok: true, buf, url: finalUrl };
}

const OLLAMA_MODEL_MISSING = 'OLLAMA_MODEL_MISSING';

function isMissingModelError(httpStatus, bodyText, data) {
  const blob = `${bodyText || ''} ${data?.error || ''}`.toLowerCase();
  if (httpStatus === 404) return true;
  if (data?.error && typeof data.error === 'string') {
    const e = data.error.toLowerCase();
    if (e.includes('try pulling') || e.includes('pull the model')) return true;
    if (e.includes('not found') && (e.includes('model') || e.includes('manifest'))) return true;
    if (e.includes('file does not exist')) return true;
  }
  if (blob.includes('model') && blob.includes('not found')) return true;
  return false;
}

/**
 * Stream POST /api/pull until complete. Uses Ollama HTTP API (works with OLLAMA_HOST).
 */
async function ollamaPullModel(host, model) {
  console.error(`\nModel "${model}" is not loaded — pulling via Ollama (can take several minutes)…\n`);
  const res = await fetch(`${host}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: model, stream: true }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ollama pull HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  let lastPct = -1;
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let j;
    try {
      j = JSON.parse(s);
    } catch {
      continue;
    }
    if (j.error) throw new Error(`ollama pull: ${j.error}`);
    if (j.status && j.total && typeof j.completed === 'number') {
      const pct = Math.min(100, Math.round((100 * j.completed) / j.total));
      if (pct !== lastPct && pct % 5 === 0) {
        lastPct = pct;
        process.stderr.write(`\r  ${j.status} ${pct}%   `);
      }
    } else if (j.status) {
      process.stderr.write(`\r  ${j.status}   `);
    }
  }
  process.stderr.write('\n');
  console.error(`Pull finished for "${model}".\n`);
}

async function ollamaChatAttempt(host, model, userText, imagesBase64, temperature) {
  const body = {
    model,
    stream: false,
    options: { temperature },
    messages: [
      {
        role: 'user',
        content: userText,
        ...(imagesBase64?.length ? { images: imagesBase64 } : {}),
      },
    ],
  };
  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (isMissingModelError(res.status, text, data)) {
      const err = new Error(data?.error || `Ollama HTTP ${res.status}: model not available`);
      err.code = OLLAMA_MODEL_MISSING;
      throw err;
    }
    throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  if (data?.error) {
    if (isMissingModelError(res.status, text, data)) {
      const err = new Error(data.error);
      err.code = OLLAMA_MODEL_MISSING;
      throw err;
    }
    throw new Error(data.error);
  }

  const content = data?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Ollama response missing message.content');
  }
  return content;
}

async function ollamaChat(host, model, userText, imagesBase64, temperature, autoPull) {
  let pulled = false;
  for (;;) {
    try {
      return await ollamaChatAttempt(host, model, userText, imagesBase64, temperature);
    } catch (e) {
      const noPull =
        autoPull === false ||
        process.env.OLLAMA_NO_AUTO_PULL === '1' ||
        process.env.OLLAMA_NO_AUTO_PULL === 'true';
      if (!noPull && !pulled && e?.code === OLLAMA_MODEL_MISSING) {
        pulled = true;
        await ollamaPullModel(host, model);
        continue;
      }
      throw e;
    }
  }
}

const ART_PRINT_SIZES_IN = [
  '8×10 in',
  '8.5×11 in',
  '11×14 in',
  '12×16 in',
  '12×18 in',
  '16×20 in',
  '18×24 in',
  '20×30 in',
  '24×36 in',
];

function randomArtPrintSize() {
  return ART_PRINT_SIZES_IN[Math.floor(Math.random() * ART_PRINT_SIZES_IN.length)];
}

const GATE_PROMPT = `You are a strict classifier for e-commerce listing photos.

Does this image show a discrete physical product someone could realistically sell online (device, clothing item, shoes, furniture piece, packaged good, accessory, etc.)?

Answer with ONLY a single JSON object, no markdown, no explanation:
{"buyable":true or false,"reason":"one short phrase"}

Set buyable false for: landscapes only, abstract textures, wallpapers, generic city views with no product, food plates without packaging, people-only portraits with no clear merchandise, memes, screenshots, text-only, empty scenes.`;

const ENRICH_PROMPT = `You help write a marketplace listing from a product photo.

Reply with ONLY one JSON object (no markdown), keys:
- "tags": array of 3-8 short lowercase English keywords
- "description": one paragraph, plain text, 2-4 sentences, seller tone
- "suggestedCategory": one of exactly: clothes, electronics, furniture, shoes, miscellaneous, fashion
- "suggestedPriceUsd": one number (not a string) — typical new US mass-retail price for what is shown; stay in a believable band for that product type (not outlet/clearance fantasy prices)
- Format the number with two decimal places and both decimals non-zero (e.g. 47.89 not 47.00 or 47.10); also avoid a 0 in the ones digit of the whole dollars (e.g. 127.63 ok, 120.63 bad)

Pick the best category for a typical e-commerce site.`;

function nowIso() {
  return new Date().toISOString();
}

/** Log to stderr and exit without mutating checkpoint for the failed id. */
function fatal(picsumId, title, err) {
  console.error(`\n[${title}] picsum id=${picsumId}`);
  if (err != null) console.error(err);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.count == null) {
    printHelp();
    if (args.count == null && !args.help) {
      console.error('Error: --count (-n) is required.');
      process.exit(1);
    }
    process.exit(0);
  }

  let state = loadState(args.output);
  let nextId =
    args.startId != null && !Number.isNaN(args.startId)
      ? args.startId
      : state.lastIDProcessed + 1;

  let interrupted = false;
  const onSigint = () => {
    interrupted = true;
    console.error('\nInterrupt — finishing current id then exiting…');
  };
  process.on('SIGINT', onSigint);

  const runStarted = nowIso();
  state.lastRunStartedAt = runStarted;
  state.lastRunFinishedAt = null;
  atomicWriteJson(args.output, state);

  let buyableThisRun = 0;
  const startNext = nextId;

  for (let i = 0; i < args.count; i++) {
    if (interrupted) break;
    const picsumId = nextId + i;
    const processedAt = nowIso();
    const imageUrl = `https://picsum.photos/id/${picsumId}/${args.width}/${args.height}`;

    const baseRow = { picsumId, imageUrl, processedAt };

    const pic = await fetchPicsumBuffer(picsumId, args.width, args.height);
    if (!pic.ok) {
      if (pic.status === 404) {
        console.error(`picsum id=${picsumId}: no image (404), skipping.`);
        state.lastIDProcessed = picsumId;
        atomicWriteJson(args.output, state);
        continue;
      }
      fatal(picsumId, 'Image fetch failed', new Error(pic.error || 'unknown'));
    }

    const b64 = pic.buf.toString('base64');

    let gateText;
    let gate;
    try {
      gateText = await ollamaChat(
        args.host,
        args.model,
        GATE_PROMPT,
        [b64],
        0.1,
        args.noAutoPull ? false : undefined,
      );
      gate = extractJsonObject(gateText);
    } catch (e) {
      fatal(picsumId, 'Ollama buyable gate request failed', e);
    }

    if (gate == null || typeof gate !== 'object') {
      console.error(String(gateText || '').slice(0, 1200));
      fatal(picsumId, 'Ollama gate response was not parseable JSON (raw response above)', null);
    }

    const buyable = Boolean(gate?.buyable);

    if (!buyable) {
      const printSize = randomArtPrintSize();
      const suggestedPriceUsd = randomArtPrintRetailUsd();
      const gateReason =
        typeof gate?.reason === 'string' ? gate.reason.trim() : '';
      const tags = ['art print', 'wall art', 'poster', 'home decor'];
      let description =
        `Open-edition decorative art print inspired by this image. ${printSize} on archival matte or semi-gloss paper; suitable for framing. Ships rolled in a protective tube.`;
      if (gateReason) {
        const r =
          gateReason.charAt(0).toUpperCase() + gateReason.slice(1);
        description += ` Subject: ${r}`;
      }
      state.results.push({
        ...baseRow,
        buyable: false,
        listingKind: 'art_print',
        printSize,
        suggestedPriceUsd,
        suggestedCategory: 'miscellaneous',
        tags,
        description,
      });
      state.lastIDProcessed = picsumId;
      atomicWriteJson(args.output, state);
      continue;
    }

    let metaText;
    let meta;
    try {
      metaText = await ollamaChat(
        args.host,
        args.model,
        ENRICH_PROMPT,
        [b64],
        0.2,
        args.noAutoPull ? false : undefined,
      );
      meta = extractJsonObject(metaText);
    } catch (e) {
      fatal(picsumId, 'Ollama metadata request failed', e);
    }

    if (meta == null || typeof meta !== 'object') {
      console.error(String(metaText || '').slice(0, 1200));
      fatal(picsumId, 'Ollama metadata response was not parseable JSON (raw response above)', null);
    }

    const tags = Array.isArray(meta?.tags)
      ? meta.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const description = typeof meta?.description === 'string' ? meta.description.trim() : '';
    const suggestedCategory = normalizeSuggestedCategory(meta?.suggestedCategory);

    let modelPrice = meta?.suggestedPriceUsd;
    if (typeof modelPrice === 'string') {
      const p = parseFloat(String(modelPrice).replace(/[^0-9.-]/g, ''));
      modelPrice = Number.isFinite(p) ? p : undefined;
    }
    if (typeof modelPrice !== 'number' || !Number.isFinite(modelPrice) || modelPrice <= 0) {
      modelPrice = undefined;
    }

    const bounds = CATEGORY_PRICE_BOUNDS_USD[suggestedCategory] || CATEGORY_PRICE_BOUNDS_USD.miscellaneous;
    const raw = rawPriceCandidate(
      { picsumId, suggestedPriceUsd: modelPrice },
      suggestedCategory,
    );
    const suggestedPriceUsd = finalizeRetailUsd(raw, bounds[0], bounds[1]);

    const enriched = {
      ...baseRow,
      buyable: true,
      tags,
      description,
      suggestedCategory,
      suggestedPriceUsd,
    };
    state.results.push(enriched);
    buyableThisRun++;
    state.lastIDProcessed = picsumId;
    atomicWriteJson(args.output, state);
  }

  state.lastRunFinishedAt = nowIso();
  atomicWriteJson(args.output, state);

  const lastId = state.lastIDProcessed;
  const idsTouched = interrupted ? Math.max(0, lastId - startNext + 1) : args.count;
  console.log(
    JSON.stringify(
      {
        ok: true,
        output: args.output,
        startedAt: runStarted,
        finishedAt: state.lastRunFinishedAt,
        idsRange: { from: startNext, to: lastId },
        idsAttemptedThisRun: idsTouched,
        buyableThisRun,
        interrupted,
        nextStartId: lastId + 1,
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
