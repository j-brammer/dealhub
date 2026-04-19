# DealHub

React Native (Expo) shopping-style app for **iOS** and **Android**. This repo uses the **managed Expo workflow**: there is no checked-in `ios/` or `android/` folder. The **Expo Go** app on each simulator loads your JavaScript from the **Metro** dev server on your Mac.

---

## What you must have installed

These are **required** to run DealHub on simulators the way this project is set up.

### On your Mac

| Requirement | Why |
|-------------|-----|
| **Node.js** (LTS, e.g. 20.x or 22.x) and **npm** | Runs Metro and the Expo CLI. |
| **Xcode** (from the Mac App Store) | iOS Simulator, Swift toolchain, `xcode-select`. |
| **Xcode Command Line Tools** | Used by native tooling. Install with `xcode-select --install` if prompted. |
| **Android Studio** | Android SDK, emulator (AVD), and usually **adb**. |

### iOS Simulator (Apple)

| Requirement | Why |
|-------------|-----|
| **Simulator** (Xcode → Open Developer Tool → Simulator, or run from Expo) | Runs the iOS build of **Expo Go** and your project. |
| **Apple ID** | Not required for Simulator-only development; only if you deploy to a physical device with signing. |

### Android Emulator

| Requirement | Why |
|-------------|-----|
| **Android SDK** (via Android Studio → SDK Manager) | Build tools and platform images for the emulator. |
| **At least one AVD** (Android Studio → Device Manager) | Virtual device (e.g. Pixel 9 Pro). |
| **`adb` available** (often `~/Library/Android/sdk/platform-tools`) | Expo uses it to install/open **Expo Go** on the emulator. |

**Environment variables (Android — strongly recommended)**

Add to your shell profile (`~/.zshrc`, etc.) so CLI tools and Expo find the SDK:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

Restart the terminal after changing this. Confirm with:

```bash
adb devices
```

You should see `emulator-5554` (or similar) when an emulator is running.

### Network

| Requirement | Why |
|-------------|-----|
| **Internet (first run)** | Expo downloads **Expo Go** onto each simulator if it is not already installed. |
| **Metro reachable from the emulator** | This project’s npm scripts use **`--localhost`** so Expo Go talks to Metro over the host loopback. That avoids the common Android-emulator issue where an **`exp://192.168.x.x:8081`** URL (LAN) fails or drops, which then shows Expo Go’s **Home** screen with an empty **Development servers** list after you dismiss an error or close the project. |
| **Internet while using the app** | Product images load from remote URLs. |

**Physical Android/iPhone on Wi‑Fi:** If you open the project on a **real device**, you may need LAN or tunnel mode instead: run **`npm run start:lan`** (or `npx expo start --tunnel` if LAN is blocked).

---

## One-time project setup

From the repository root:

```bash
npm install
```

---

## Catalog enrichment (local scripts)

Optional **Node** scripts (not used by the Expo app at runtime) help you build a **checkpoint JSON** from [Lorem Picsum](https://picsum.photos/) image ids using a **local Ollama** vision model, then **POST** buyable rows to the [Platzi Fake Store](https://fakeapi.platzi.com/) API.

**Requirements**

| Requirement | Why |
|-------------|-----|
| **Node.js 18+** (global `fetch`) | Runs the `.mjs` scripts. |
| **[Ollama](https://ollama.com/)** running locally | Vision inference (`/api/chat` with base64 images). |
| A **vision-capable** model in Ollama | Default: `qwen2.5vl:7b`. If it is not downloaded yet, the enrich script detects a missing model, calls Ollama’s **`/api/pull`** once, then retries (same as `ollama pull`). Disable with **`--no-auto-pull`** or env **`OLLAMA_NO_AUTO_PULL=1`**. |
| **Network** | Scripts fetch Picsum images and call Platzi’s HTTPS API. |

**Source of truth**

There is **no separate database**. The JSON file you pass to `--output` / `--input` holds everything:

- **`lastIDProcessed`** — last Picsum **numeric id** the enricher advanced past (including **`buyable: false`** rows and **Picsum 404** skips — no row is stored for missing ids; the next id is tried). **Other network errors, Ollama failures, or JSON parse failures** print to the terminal and **`exit 1`** without advancing the cursor for that id, so the next run retries the same id.
- **`results`** — one object per **successfully processed** id only. **Buyable** rows include `tags`, `description`, `suggestedCategory`, `imageUrl`, `suggestedPriceUsd`. **Non-buyable** rows may be **`listingKind: 'art_print'`** (print metadata + price). **`platzi:seed`** posts **both** **`buyable: true`** and **`art_print`** rows by default; use **`--buyable-only`** to skip art prints. Error rows are not stored.

The enrich script **rewrites this file after every id** (atomic write) so you can stop and resume safely. The seed script **removes a row from `results` only after a successful Platzi `POST /products`**, so rerunning the seeder does not duplicate products. **`lastIDProcessed` is not changed** by seeding — it only tracks the vision pipeline cursor.

### 1. Enrich: Picsum + Ollama → JSON

Start Ollama, then from the repo root. **npm** needs `--` before arguments passed to the script:

```bash
npm run picsum:enrich -- 10
```

That is shorthand for `--count 10`. Equivalent long form:

```bash
npm run picsum:enrich -- --count 10
```

Default output file: **`data/picsum-enrichment.json`**. Use another path:

```bash
npm run picsum:enrich -- --output ./my-enrichment.json 25
```

Useful flags (see `node scripts/picsum-ollama-batch.mjs --help`):

| Flag | Purpose |
|------|---------|
| `--count` / `-n` | **Required.** How many **Picsum ids** to scan this run (not “number of buyable items”). |
| `--output` / `-o` | Checkpoint JSON path. |
| `--start-id` | Force the next id to scan (overrides resume from `lastIDProcessed + 1`). |
| `--model` / `-m` | Ollama model name (or env **`OLLAMA_MODEL`**). |
| `--host` | Ollama base URL (or env **`OLLAMA_HOST`**, default `http://127.0.0.1:11434`). |
| `--width`, `--height` | Picsum image dimensions (default 512×512). |

When a batch finishes, the script prints a **JSON summary** to stdout (`idsRange`, `buyableThisRun`, `nextStartId`, etc.).

**Interrupts:** `Ctrl+C` sets a flag so the loop stops after the **current** id; progress up to the last completed id is already on disk.

### 2. Seed: JSON → Platzi Fake Store

Posts **`buyable === true`** rows and **`listingKind: 'art_print'`** rows by default (`art_print` uses category **miscellaneous**, title includes print size). **`--buyable-only`** limits seeding to buyable products. **Deletes each successful row from `results`** in the same file.

**Pricing:** Buyable rows store **`suggestedPriceUsd`** in a **retail-style** shape: **always two decimal places**, **both cent digits 1–9** (no `.10`, `.03`, `.00`, …), and the **ones digit of the dollar amount is not 0** (no `$120.45`-style prices). The vision model is asked for a believable mass-retail number; [`scripts/retail-price.mjs`](scripts/retail-price.mjs) **snaps** to the closest valid price inside per-category USD bands (and seeding uses the same helper). Older JSON without `suggestedPriceUsd` still gets a formatted price from the fallback path. This remains **demo pricing**, not a live quote.

```bash
npm run platzi:seed -- --limit 5
```

Default input: **`data/picsum-enrichment.json`**. Options:

| Flag | Purpose |
|------|---------|
| `--input` / `-i` | Enrichment JSON path. |
| `--limit` / `-n` | Max successful POSTs **this run** (default: all matching rows). |
| `--buyable-only` | Post only **`buyable: true`** (skip **`art_print`** rows). |
| `--delay` | Milliseconds between POSTs (default **400**). |

Stdout is a JSON summary (`posted`, `failed`, `remainingBuyable`, `remainingArtPrints`, optional **`hint`**, first errors).

**Note:** Platzi is a **shared demo API**; products may be edited or deleted by others. The seed script sends an explicit **`slug`** with a random suffix (`dh-print-{id}-{hex}` / `dh-buyable-{id}-{hex}`) so re-seeding and shared-DB collisions do not hit **`UNIQUE constraint failed: product.slug`**. Titles also append **`·#picsumId`** so auto-generated slugs stay distinct if the API derives them from the title. If `POST /products` returns **401**, check [Platzi auth docs](https://fakeapi.platzi.com/) and add a Bearer token to the script if you extend it.

### Suggested workflow

1. Run enrich in small **`--count`** chunks, inspect the JSON, repeat until you have enough buyable rows.
2. Run **`platzi:seed`** with a small **`--limit`**, verify products in the app, repeat.
3. Commit the JSON only if you want it in git; large or personal runs are often **gitignored** (e.g. `data/picsum-enrichment.json`).

---

## Run on **both** simulators at once (recommended)

1. Start **iOS Simulator** and **Android Emulator** (or let Expo boot the iOS device it targets).
2. From the project root:

   ```bash
   npm run simulators
   ```

   Under the hood this uses **`--localhost`** so the **Android emulator** can reach Metro reliably (see [Android / Expo Go disconnected](#android--expo-go-disconnected-or-development-servers-is-empty)).

   ```bash
   npx expo start --ios --android --go --localhost
   ```

   **What happens:**

   - **Metro** starts on **port 8081** (default).
   - Expo opens the project in **Expo Go** on the booted **iOS** simulator and on the running **Android** emulator.
   - The **first time** on each platform, Expo may **download and install Expo Go** on that simulator/emulator (needs network).

3. Leave that terminal running. Edits to your code reload on both clients (Fast Refresh) while they stay connected.

---

## Run on **one** simulator only

**iOS**

```bash
npm run ios
```

**Android** (emulator must already be running, or start it from Android Studio → Device Manager)

```bash
npm run android
```

**Interactive dev server** (then choose platform in the terminal UI)

```bash
npm start
```

Press **`i`** for iOS Simulator or **`a`** for Android when prompted.

---

## Command reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install Node dependencies (required once per clone). |
| `npm run simulators` | Metro (**localhost**) + open **both** simulators in **Expo Go**. |
| `npm start` | Metro (**localhost**); use terminal menu / `i` / `a`. |
| `npm run ios` | Metro (**localhost**) + iOS Simulator (**Expo Go**). |
| `npm run android` | Metro (**localhost**) + Android Emulator (**Expo Go**). |
| `npm run start:lan` | Metro with **LAN** URL (for **physical devices** on the same Wi‑Fi). |
| `npm run android:reverse` | Forwards emulator port **8081** → Mac (run if Android still cannot load Metro; emulator must be running). |
| `npm run web` | Open in web browser (optional). |
| `npm run picsum:enrich` | Local Picsum + Ollama checkpointed enricher; pass count after `--`, e.g. `npm run picsum:enrich -- 10` (see [Catalog enrichment](#catalog-enrichment-local-scripts)). |
| `npm run platzi:seed` | POST buyable + **`art_print`** rows to Platzi by default; **`--buyable-only`** skips prints; removes synced rows from file. |
| `npx expo start --clear --localhost` | Clean bundler cache + **localhost** (same idea as our default scripts). |

---

## How this lines up with “real” App Store builds

- **Right now:** Simulators run **Expo Go**, which loads your project from Metro. That is the fastest loop for UI and JS changes.
- **Later:** For standalone `.ipa` / `.apk` or store builds you would add **EAS Build** or run **`npx expo prebuild`** and open the generated native projects; that is **not** required for local simulator development with this repo.

---

## Troubleshooting

### iOS: “No simulator”, boot failures, or Expo Go won’t open

- Open **Simulator** manually and pick a device (e.g. iPhone 17 Pro), then run `npm run ios` or `npm run simulators` again.
- In Xcode, **Settings → Locations → Command Line Tools** should point at your Xcode install.

### Android: “No devices found” or install fails

- Start an **AVD** from Android Studio until you see the home screen.
- Run `adb devices` — the emulator must appear as `device`, not `offline`.
- Ensure **`ANDROID_HOME`** and **`platform-tools`** are on your **`PATH`** (see above).

### Android / Expo Go disconnected or “Development servers” is empty

What you’re seeing is **Expo Go’s home screen**: it appears when the app is **not connected** to a running Metro server (often after a **“could not connect”** / **load script** error, or after force-closing the project).

1. **Stop any old Metro** (close the terminal where `expo start` is running, or free port **8081**), then from the project root start again:

   ```bash
   npm run android
   ```

   or for both simulators:

   ```bash
   npm run simulators
   ```

   These commands use **`--localhost`**, which is what the **Android emulator** expects for Metro in most setups.

2. If Android **still** cannot load the bundle, with the **emulator running**:

   ```bash
   npm run android:reverse
   npm run android
   ```

   That runs `adb reverse tcp:8081 tcp:8081` (via `scripts/adb-reverse.sh`, which uses **`$ANDROID_HOME`** or **`~/Library/Android/sdk`**) so traffic to `127.0.0.1:8081` inside the emulator reaches Metro on your Mac. Ensure **`platform-tools`** is installed in that SDK.

3. **Manual URL in Expo Go** (last resort): open **Enter URL manually** and try the URL printed in the terminal (often `exp://127.0.0.1:8081` when using localhost mode). If it fails, run **`npm run android:reverse`** and try again.

### Metro connects on one simulator but not the other

- **Android:** Prefer **`npm run simulators`** / **`npm run android`** (they default to **`--localhost`**). Use **`npm run android:reverse`** if needed.
- **Physical device:** Use **`npm run start:lan`** or **`npx expo start --tunnel`** so the phone can reach your Mac.
- Temporarily disable VPN or strict firewall rules for **port 8081** on your Mac.

### Stale bundles or odd errors

```bash
npx expo start --clear
```

### Dependency issues

```bash
rm -rf node_modules
npm install
```

---

## Project layout (high level)

- `app/` — Expo Router screens (tabs, product, category).
- `context/` — Cart state.
- `data/` — Catalog mappers and mocks; optional **`picsum-enrichment.json`** if you run the enrich script (not committed by default).
- `scripts/` — `adb-reverse.sh`, **`picsum-ollama-batch.mjs`**, **`platzi-seed-from-enrichment.mjs`**.
- `components/` — Shared UI.
- `app.json` — Expo config (name **DealHub**, scheme `dealhub`).

If anything in this doc does not match your machine (e.g. different SDK path on Linux), adjust paths and re-run `adb devices` / `npm run simulators` after fixing the environment.
