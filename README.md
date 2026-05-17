# DealHub

## Why DealHub exists

Shopping on a phone should not feel like a trap. Apps such as **Temu**, **Shein**, and other bargain-marketplace experiences are built to **pull people back again and again**—flash sales, countdown timers, gamified rewards, endless scroll, and one-tap checkout. For someone living with **dementia**, **mild cognitive impairment**, **post-stroke memory changes**, **ADHD-related impulsivity**, or simply the **normal forgetfulness** that comes with aging, those patterns are especially risky. A person may not remember placing an order, may not recognize how much they have already spent, or may feel ashamed and confused when packages keep arriving.

DealHub is a **deliberate alternative** for families and caregivers who want a loved one to still browse and buy real items—without handing them an app whose business model depends on **impulse and confusion**. We are not claiming to be medical software or a substitute for human judgment; we are offering a **calmer storefront** you can build and install yourself, with familiar shopping flows and without the predatory urgency of the worst “deal” apps.

If you are supporting someone in **memory care**—at home or in a facility—this project is for you: less noise, fewer dark patterns, and a path to **private installs** where **you** control the device, the credentials, and who receives the build. The technical sections below explain how to set that up.

**This is not a one-tap install.** There is no App Store listing you can hand to someone and walk away. DealHub takes **real setup**: eBay developer credentials, editing config files, building the app, and loading it onto a phone (often with a Mac for iPhone). Plan on **hours, not minutes**, the first time. If that is not you, that is normal—**find someone in the family** (or a trusted friend) who is comfortable with **code**, or at least with **AI assistants** that can follow the README with them, and ask them to get the first build onto the device. After it is installed and trusted, day-to-day use can stay simple for the person shopping; the hard part is the one-time technical lift.

---

React Native app built with **Expo SDK 54** and **Expo Router**. The in-app catalog is powered by the **eBay Browse API** (live listings). You can run it in **Expo Go** during development or produce **installable builds** with **EAS Build**.

**Self-builders:** There is no hosted “DealHub API key” and no store install—you configure and build the app yourself (see [Why DealHub exists](#why-dealhub-exists)). You need your own **eBay developer application** (and, depending on how you ship, **Apple** / **Google** / **Expo** accounts). See [Required accounts (self-build)](#required-accounts-self-build).

## Screenshots

DealHub includes **light** and **dark** themes. **By default**, **Account → Appearance** is **Use device setting**—the app follows the phone’s system light/dark mode (iOS **Settings → Display & Brightness**, Android **Display**). Shoppers can also pin **Light** or **Dark** if you prefer a fixed look.

The captures below are from **dark mode** on iPhone.

| Home — prize wheel | Home — browse & search | Orders |
|:---:|:---:|:---:|
| ![DealHub home with daily prize wheel modal](image1.png) | ![DealHub home screen with categories and product grid](image2.png) | ![DealHub orders list with delivered items](image3.png) |
| Daily spin for store credit; calmer than flash-sale apps | Search, filters, and eBay-powered recommendations | Order history saved on the device |

---

## Table of contents

1. [Why DealHub exists](#why-dealhub-exists)
2. [Screenshots](#screenshots)
3. [Overview](#overview)
4. [Required accounts (self-build)](#required-accounts-self-build)
5. [What you need installed](#what-you-need-installed)
6. [One-time setup](#one-time-setup)
7. [Configuration (environment variables)](#configuration-environment-variables)
8. [Private distribution & eBay Developer credentials](#private-distribution--ebay-developer-credentials)
9. [Building release binaries](#building-release-binaries)
10. [Install on a physical iOS device](#install-on-a-physical-ios-device)
11. [Install on a physical Android device](#install-on-a-physical-android-device)
12. [Run the app (development)](#run-the-app-development)
13. [Using the app](#using-the-app)
14. [Production and test builds (EAS)](#production-and-test-builds-eas)
15. [App icons and brand assets](#app-icons-and-brand-assets)
16. [Project layout](#project-layout)
17. [Command reference](#command-reference)
18. [Troubleshooting](#troubleshooting)
19. [Keeping the repo current (and contributing)](#keeping-the-repo-current-and-contributing)
20. [Links](#links)

---

## Overview

| Topic | Details |
|--------|---------|
| **Framework** | Expo ~54, React 19, React Native 0.81, New Architecture enabled (`app.json`). |
| **Navigation** | File-based routes under `app/` (tabs: Home, Orders, Cart, Account; stacks for product, category, order detail). |
| **Catalog** | eBay Browse search + item detail; credentials via `EXPO_PUBLIC_EBAY_*` in `.env`. |
| **Local state** | Cart, account (profile, addresses, payments), orders, wallet / prize wheel, theme preference — **on the phone only** via **AsyncStorage** (no DealHub cloud). See [Privacy and data](#privacy-and-data-addresses-payments). |
| **Deep linking** | Scheme `dealhub` (see `app.json`). |
| **Appearance** | **Light** / **Dark** / **Use device setting** (default). Follows system light/dark when set to device; override in **Account → Appearance**. See [Screenshots](#screenshots). |

---

## Required accounts (self-build)

Use this as a **checklist** when you (or someone you share the repo with) will **build and install DealHub locally**. Nothing here replaces reading the linked sections for signing, bundle IDs, and `.env` setup.

| Account / registration | Required for | Cost (typical) | Notes |
|------------------------|--------------|----------------|--------|
| **eBay account + eBay Developers Program** | **Catalog, search, product detail** (Browse API) | Free developer access; Production keys need [compliance](https://developer.ebay.com/marketplace-account-deletion) | Create an **application** and copy **Client ID** + **Client secret** into `.env`. Step-by-step: [Private distribution & eBay Developer credentials](#private-distribution--ebay-developer-credentials). |
| **Apple ID** | **Xcode**, **iOS Simulator**, signing **your own** `.ipa` / `.app` for a device | Free | Used for **Personal Team** (free) or as login for a **paid** team. Physical USB install: often need a **globally unique** `expo.ios.bundleIdentifier` in [app.json](app.json). |
| **Apple Developer Program** | **TestFlight**, **App Store**, **Ad Hoc** with registered UDIDs, some **entitlements** at scale | Paid (annual membership) | **Not** required for every local Release install on your own phone with a Personal Team, but required for store distribution and TestFlight. |
| **Google account** | **Android Studio**, emulators with Google APIs, **Play Console** | Free for Studio/emulators | Same Google account can own Play Console. |
| **Google Play Console developer account** | Publishing to **Google Play** (any track) | One-time registration fee (check [Google Play Console](https://play.google.com/console/signup) for current pricing) | **Not** required to build and sideload an **APK/AAB** with Gradle or EAS for personal use (`adb install`, “unknown sources”). |
| **Expo account** (`expo.dev`) | **`eas login`**, **EAS Build**, **`eas init`**, CI **`EXPO_TOKEN`** | Free tier available | **Optional** if you only use **`npx expo prebuild`** + **Xcode** + **Gradle** and never run cloud EAS builds. |

### eBay (mandatory for a working catalog)

1. Sign in at [developer.ebay.com](https://developer.ebay.com/) with an **eBay** user identity.
2. Join the **Developers Program** and create an **application** with a **Production** (or Sandbox) keyset.
3. Complete **Production** compliance (marketplace account deletion notifications) if eBay disables Production keys until you do.
4. Put **`EXPO_PUBLIC_EBAY_CLIENT_ID`** and **`EXPO_PUBLIC_EBAY_CLIENT_SECRET`** in repo-root **`.env`** before bundling (see [.env.example](.env.example)).

Without these, the app builds but **listing search and item detail will not authenticate**.

### iOS (Apple)

- **Always:** An **Apple ID** signed into **Xcode** (Xcode → Settings → Accounts) so Xcode can create **signing certificates** and **provisioning profiles**.
- **USB / local install (iOS 16+):** **Developer Mode** on the phone; **Trust** the Mac when prompted; after install, [trust the developer app](#trust-the-developer-app-first-launch-after-usb-install) (tap DealHub first—Settings path varies by iOS version).
- **USB / local install:** Personal Team or paid team; each **new device UDID** must be on your provisioning profile (Xcode automatic signing or the `xcodebuild` flags in the install guide).
- **TestFlight or App Store:** **Apple Developer Program** membership and **App Store Connect** access for the same (or linked) Apple identity / team.
- **Push:** This repo adjusts entitlements for **Personal Team** limits; full **remote push** with Apple’s production environment usually expects a **paid** program and correct capabilities—see [Troubleshooting](#troubleshooting).

### Android (Google)

- **Local debug / release APK you install yourself:** A **Google account** is **not** strictly required for `adb install`; you need **USB debugging** and a build artifact ([Install on a physical Android device](#install-on-a-physical-android-device)).
- **Google Play distribution:** A **Play Console** developer account and app signing setup (upload key, Play App Signing). Configure credentials in **EAS** or **Gradle** per Expo/Android docs when you run **`eas:build:prod:android`** or ship an **AAB**.

### Expo / EAS (optional)

- Register at [expo.dev](https://expo.dev), then **`npx eas login`** and **`npm run eas:init`** once per project clone if you use cloud builds ([Production and test builds (EAS)](#production-and-test-builds-eas)).
- **CI:** Optional **`EXPO_TOKEN`** from Expo (programmatic access) for non-interactive **`eas build`**—see [.env.example](.env.example).

### Not required to run the app

- **GitHub** (or any git host): only needed to **obtain** the source; the running app does not call GitHub.
- A **DealHub-hosted** backend or shared API key: the open pattern is **per-builder eBay keys** in `.env` (see [Why private builds?](#why-private-builds)).

---

## What you need installed

### On your Mac (typical)

| Requirement | Why |
|-------------|-----|
| **Node.js** (LTS, e.g. 20.x or 22.x) and **npm** | Metro and Expo CLI. |
| **Xcode** | iOS Simulator and toolchain. |
| **Xcode Command Line Tools** | `xcode-select --install` if needed. |
| **Android Studio** | Android SDK, emulator (AVD), **adb**. |

### Android environment (recommended)

Add to `~/.zshrc` (or your shell profile):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

Confirm with `adb devices` when an emulator is running.

### Network

- **Internet** for eBay API, images, and (first run) installing Expo Go on simulators.
- Scripts default to **`--localhost`** so the **Android emulator** can reach Metro reliably; see [Troubleshooting](#troubleshooting).

---

## One-time setup

**Who should run this section?** A caregiver who is already technical, or a relative who can spend an afternoon with the README (and optionally an AI coding agent). Most families should **not** expect the person with memory challenges to perform these steps.

From the repository root:

```bash
npm install
cp .env.example .env
```

1. **Accounts:** Create what you need (minimum: **eBay Developers**; plus **Apple** / **Google** / **Expo** for native or store builds)—see [Required accounts (self-build)](#required-accounts-self-build).
2. **`.env`:** Set **`EXPO_PUBLIC_EBAY_CLIENT_ID`** and **`EXPO_PUBLIC_EBAY_CLIENT_SECRET`** (and optional vars). Never commit `.env`. See [Configuration](#configuration-environment-variables).
3. **Bundle IDs (iOS Personal Team):** In **[app.json](app.json)**, set **`expo.ios.bundleIdentifier`** (and optionally **`expo.android.package`**) to a **globally unique** reverse-DNS string you own (e.g. `com.yourname.dealhub`). See [Personal Team: unique bundle identifier](#personal-team-unique-bundle-identifier).
4. **Native projects (local Xcode / Gradle only):** Generate **`ios/`** and **`android/`** (gitignored here):

   ```bash
   npx expo prebuild --platform ios
   npx expo prebuild --platform android
   cd ios && pod install && cd ..
   ```

   Re-run **`prebuild`** after changing **`app.json`** plugins or bundle IDs, or when upgrading Expo SDK.

5. **Expo Go only:** Steps 3–4 are optional; use [Run the app (development)](#run-the-app-development) with **`npm run ios`** / **`npm run android`**.

---

## Configuration (environment variables)

Expo inlines **`EXPO_PUBLIC_*`** into the **JavaScript bundle** shipped inside the app. Anyone with the binary can inspect it (e.g. unzip an APK, search strings). Treat shipped credentials as **exposed**. To keep a true secret, **do not** put it in `EXPO_PUBLIC_*`; call your own backend, and let the server talk to eBay.

| Variable | Purpose |
|----------|---------|
| **`EXPO_PUBLIC_EBAY_CLIENT_ID`** | eBay application client ID (required for catalog). |
| **`EXPO_PUBLIC_EBAY_CLIENT_SECRET`** | eBay application client secret (used for app token in `lib/ebayBrowseClient.ts`). |
| **`EXPO_PUBLIC_EBAY_DEFAULT_Q`** | Default Browse `q` for the “All” lane (default in `.env.example`: `deals`). |
| **`EXPO_PUBLIC_EBAY_API_ROOT`** | Optional; default `https://api.ebay.com`. |
| **`EXPO_PUBLIC_EBAY_MARKETPLACE_ID`** | Optional; default `EBAY_US`. |
| **`EXPO_PUBLIC_EBAY_OAUTH_SCOPE`** | Optional; default `https://api.ebay.com/oauth/api_scope`. |
| **`EXPO_TOKEN`** | Optional; for **CI** EAS builds. Locally use `eas login`. See [.env.example](.env.example). |

Full template: [.env.example](.env.example).

---

## Private distribution & eBay Developer credentials

Account checklist (eBay, Apple, Google, Expo) for anyone building from source: [Required accounts (self-build)](#required-accounts-self-build).

### Why private builds?

- **eBay allocates API traffic per application.** Publishing one global API key in open source or in a public app store listing means **every user shares the same quota** (for example, on the order of thousands of calls per day depending on your key tier and eBay’s current limits). A small number of heavy users can exhaust it for everyone.
- **You should not paste production keys into a public repository** or embed a single shared key in an app meant for untrusted distribution if you care about quota and abuse.
- **Practical model for DealHub:** each **trusted recipient** (you, a colleague, a friend) **creates their own eBay developer application**, puts **their own** `EXPO_PUBLIC_EBAY_CLIENT_ID` / `EXPO_PUBLIC_EBAY_CLIENT_SECRET` in `.env`, and **builds the app themselves** (or you hand them a binary **they** built on their machine). That way each person’s usage counts against **their** eBay app, not yours.

This README explains how to **get eBay credentials** and how to **build and install** the native app on **iOS and Android** devices.

### Step-by-step: Join the eBay Developers Program and create API keys

These steps follow eBay’s official “create keyset” flow. Official references:

- [Create the eBay API keysets](https://developer.ebay.com/api-docs/static/gs_create-the-ebay-api-keysets.html)
- [Getting your OAuth credentials](https://developer.ebay.com/api-docs/static/oauth-credentials.html)
- [Buy Browse API overview](https://developer.ebay.com/api-docs/buy/browse/overview.html)

**1. Sign in**

- Open [https://developer.ebay.com/](https://developer.ebay.com/) and sign in with an eBay account (create one if needed).

**2. Join / use the Developers Program**

- Accept the developer terms if prompted so your account can create applications.

**3. Open Application Keys**

- In the developer console, go to **Your account** (or **Application keys**) and open the **Application keys** page where you manage Sandbox and Production keysets.

**4. Name your application and create a keyset**

- Enter an **application name** (e.g. `DealHub Personal`).
- Under **Sandbox** or **Production**, click **Create a keyset** (wording may vary slightly).
- If you already have an app, select it and create the keyset for the environment you need.

**5. Production compliance (required before Production works)**

- eBay may show **“Your Keyset is currently disabled”** until you complete **marketplace account deletion / closure** compliance. Follow the link in the developer portal to **subscribe to or opt out of** [marketplace account deletion notifications](https://developer.ebay.com/marketplace-account-deletion). This is **mandatory** for Production keys per eBay’s docs.

**6. Copy credentials into `.env`**

- On the Application keys page, eBay shows identifiers for OAuth. For client-credentials (application) access, you need:
  - **Client ID** (eBay often labels this **App ID** in the keyset table).
  - **Client secret** (eBay often labels this **Cert ID** or similar in the developer UI).
- Map them in your repo root `.env`:

  ```bash
  EXPO_PUBLIC_EBAY_CLIENT_ID=<your App ID / Client ID>
  EXPO_PUBLIC_EBAY_CLIENT_SECRET=<your Cert ID / Client secret>
  ```

- Use **Production** values for real listings (`https://api.ebay.com`). Use **Sandbox** only if you point the app at sandbox endpoints (DealHub defaults to production URLs; see [.env.example](.env.example)).

**7. Browse API access**

- DealHub uses the **Buy Browse API** for search and item detail. Your keyset’s **scopes / subscribed APIs** must allow the Browse API for the flows you use. If calls fail with auth or scope errors, open your application in the developer portal and confirm **Browse API** (Buy API family) is enabled for that app. See the [Browse API overview](https://developer.ebay.com/api-docs/buy/browse/overview.html) and eBay’s support articles for your account type.

**8. Rate limits**

- eBay enforces **per-application** limits. If you outgrow the default allocation, use eBay’s developer support and documentation on **application growth** / rate limits. Designing the app so **each user has their own application** (their own keys) avoids one shared 5k-style ceiling for all users.

---

## Building release binaries

Native folders **`ios/`** and **`android/`** are **gitignored** in this repo (see [.gitignore](.gitignore)). Generate them when you need a local Xcode / Gradle build:

```bash
npx expo prebuild --platform ios
npx expo prebuild --platform android
```

Then open Xcode / Android Studio, or use the CLI commands below. **Recreate native projects after upgrading Expo SDK** if templates drift.

### Environment and Metro

- **Set `.env` before building** so `EXPO_PUBLIC_*` values are baked in at bundle time. After changing `.env`, run a **clean** build if the app still shows old catalog behavior.
- A **release** build embeds the JS bundle in the app and does **not** require Metro on the phone. A **debug** build may still try to load from a dev server depending on configuration.

### iOS (local, Xcode toolchain)

**Requirements:** macOS, Xcode, CocoaPods (`pod`).

```bash
cd ios && pod install && cd ..
# List USB devices (copy the UDID in parentheses):
xcrun xctrace list devices
# Install Release build on one phone (replace with your device name or UDID):
npx expo run:ios --configuration Release --device "Your iPhone Name"
```

(`npm run ios:device` is the same as `expo run:ios --configuration Release --device` but **does not** pick a device for you—pass **`--device`** when more than one iPhone is paired or the terminal is non-interactive.)

- **`--device`**: physical iPhone (USB). Use the device **name** or **UDID** from `xcrun xctrace list devices`. Xcode needs a valid **Team** and signing; with a **free Personal Team** you almost always need a **unique bundle identifier** (see [Personal Team: unique bundle identifier](#personal-team-unique-bundle-identifier) below).
- **Simulator only:** `npx expo run:ios --configuration Release` (omit `--device`).

**Where Xcode puts the product**

- Typical pattern (exact hash folder name varies):

  - Simulator Release:  
    `~/Library/Developer/Xcode/DerivedData/DealHub-*/Build/Products/Release-iphonesimulator/DealHub.app`
  - Device Release:  
    `~/Library/Developer/Xcode/DerivedData/DealHub-*/Build/Products/Release-iphoneos/DealHub.app`

**Archive / IPA (for Ad Hoc or TestFlight)**

1. Open `ios/DealHub.xcworkspace` in Xcode.
2. Select **Any iOS Device (arm64)** or your device.
3. **Product → Archive**.
4. Use the Organizer to **Distribute App** (Ad Hoc, App Store Connect / TestFlight, etc.) per Apple’s workflow.

**Verified on maintainer machine (2026-04-23):** Release build for simulator succeeded with:

`npx expo run:ios --configuration Release --no-bundler`

(product installed to simulator from DerivedData as above).

### Android (local, Gradle)

**Requirements:** Android SDK, JDK, `ANDROID_HOME` set (see [What you need installed](#what-you-need-installed)).

```bash
cd android
./gradlew assembleRelease
```

- Unsigned / default release output (path may vary slightly by Gradle plugin):

  `android/app/build/outputs/apk/release/app-release.apk`

- For Play Store or long-term sideloading, configure **signing** (upload keystore) in `android/app/build.gradle` per [Expo app signing](https://docs.expo.dev/app-signing/app-credentials/) or Android docs.

### Cloud builds (EAS) — good when recipients lack a Mac

From the repo root, with Expo account configured:

```bash
npx eas login
npm run eas:init    # once: links project, writes projectId into app.json — commit that change
npm run eas:build:preview:ios      # or :android — internal installable artifacts
npm run eas:build:prod:ios         # store-ready when signing is configured
```

Download the **.ipa** / **.apk** / **.aab** from the Expo dashboard when the build finishes. See [Production and test builds (EAS)](#production-and-test-builds-eas) and [EAS internal distribution](https://docs.expo.dev/build/internal-distribution/).

---

## Install on a physical iOS device

### Prerequisites

- **Apple ID** signed into Xcode (see [Required accounts (self-build)](#required-accounts-self-build) → iOS).
- **Apple Developer Program** membership (paid, annual) if you use **TestFlight**, **App Store**, or **Ad Hoc** with registered device IDs. A **free Personal Team** can suffice for **your own** USB installs if signing succeeds.
- **USB cable** or **TestFlight** / enterprise distribution (advanced).

### Developer Mode (iOS 16+)

Required for **USB development installs** on modern iOS. Xcode may report **`Developer Mode disabled`** until this is on.

**If you see Developer Mode in Settings**

1. **Settings → Privacy & Security** → scroll down → **Developer Mode**.
2. Turn **On**; restart if prompted, then confirm the system alert.

**If you do not see Developer Mode**

- Confirm **iOS 16+** (**Settings → General → About**). There is no Developer Mode toggle on older iOS.
- Connect the phone to the Mac (USB, unlocked, **Trust** this computer), then run **one** install from Xcode or `npx expo run:ios --configuration Release --device <UDID>`. iOS often **reveals** the toggle or shows an on-device prompt to enable Developer Mode after the first development install attempt.
- Search Settings for **Developer Mode**.

Without Developer Mode enabled, Xcode may time out with **error 70** or refuse the device as a build destination.

### Trust the computer

1. Connect the iPhone with USB.
2. Unlock the phone; tap **Trust** if iOS asks whether to trust this computer.

This is **only** about the USB connection to your Mac—not the same as trusting the DealHub app to run (see [Trust the developer app](#trust-the-developer-app-first-launch-after-usb-install) below).

### Trust the developer app (first launch after USB install)

After a USB install, DealHub may sit on the home screen but **will not launch** until you trust the Apple ID that signed it. On many iPhones the trust screen **does not exist in Settings until you tap DealHub once** and iOS shows an **Untrusted Developer** (or similar) alert.

**Recommended flow (try this first)**

1. Tap the **DealHub** icon on the home screen.
2. Read the alert. If it offers **Details**, **Settings**, or a link to open the trust page, use that—this is the most reliable path on current iOS.
3. If the alert only has **Cancel**, open **Settings** manually and continue with step 4.

**Manual path in Settings (labels vary by iOS version)**

4. Open **Settings → General** and scroll toward the bottom. Look for **one** of these menu names (your phone may not show all of them):

   | Menu name under **General** | Typical iOS versions |
   |-----------------------------|--------------------|
   | **VPN & Device Management** | iOS 15–17 (and some 18+) |
   | **Device Management** | Some iOS 18+ builds |
   | **Profiles & Device Management** | iOS 14 and earlier |

   **Cannot find it?** In Settings, pull down and **search** for `Device Management`, `VPN`, or `Developer`. Do **not** look under **Privacy & Security** for this step—that is where **Developer Mode** lives (a separate requirement; see [Developer Mode (iOS 16+)](#developer-mode-ios-16)).

5. Open that menu. Under **Developer App** (or a list that shows your Apple ID / team), tap the developer name—often **Apple Development: you@email.com** or your Apple ID display name.

6. Confirm trust (wording depends on iOS):

   - **iOS 17 and earlier:** tap **Trust**, then confirm **Trust** again.
   - **iOS 18 and later:** you may see **Allow & Restart** (or similar) instead of **Trust**. The phone may **restart**; after it comes back, follow any on-screen steps. Stay on **Wi‑Fi or cellular** so Apple can verify the certificate.

7. Open **DealHub** again from the home screen.

**Still stuck?**

| Situation | What to try |
|-----------|-------------|
| **No “VPN / Device / Profiles” item under General** | Tap DealHub once, then check **General** again. Re-run the USB install if the app never actually installed. |
| **You only see VPN configs, no Developer App** | Wrong screen, or first launch was skipped—tap DealHub, then return to **General**. |
| **“DealHub” Is No Longer Available** | Signing expired; reinstall first ([troubleshooting](#ios-device-dealhub-is-no-longer-available)), then trust again. |
| **Developer Mode** | **Settings → Privacy & Security → Developer Mode** must be **On** for USB dev installs (iOS 16+). That is separate from trusting the developer certificate under **General**. |

### Personal Team: unique bundle identifier

If you sign with a **free Apple ID** (“Personal Team”) and **Automatically manage signing**, provisioning often **only succeeds** when the app’s **bundle identifier** is **unique to you**—typically reverse-DNS such as `com.yourname.dealhub`—not a generic id that Apple has already associated with another app or another team.

**What to do**

1. Edit **[app.json](app.json)** → **`expo.ios.bundleIdentifier`** and set it to your own value (example: `com.jasonbrammer.dealhub`).
2. Optionally set **`expo.android.package`** to the same style of string so Android builds stay aligned.
3. Apply it to the Xcode project: from the repo root run **`npx expo prebuild --platform ios`** (or change **Bundle Identifier** under the target’s **General** tab if you maintain `ios/` without prebuild).
4. In Xcode: **Product → Clean Build Folder**, then build/run on the device again.

The template default **`com.dealhub.app`** is convenient for **simulators** and for **paid** Apple Developer teams; for **Personal Team installs on a physical iPhone**, switching to a **unique** bundle id is commonly what makes signing work.

### Install via CLI (recommended for USB)

End-to-end from a clean clone (after [One-time setup](#one-time-setup)):

```bash
npm install
cp .env.example .env   # then edit .env with your eBay keys
npx expo prebuild --platform ios
cd ios && pod install && cd ..
xcrun xctrace list devices
npx expo run:ios --configuration Release --device "<device name or UDID>"
```

This uses **Release** so **`main.jsbundle`** is embedded: the app runs from the home screen **without Metro**.

**After the command**

| Outcome | What to do |
|--------|------------|
| **Build succeeded, install failed: device locked** | Unlock the phone and run the same command again (install often completes on retry). |
| **Build failed: provisioning profile doesn’t include device** | Phone is new to your Apple team. With the device connected and **Automatically manage signing** on in Xcode, run once: `cd ios && xcodebuild -workspace DealHub.xcworkspace -scheme DealHub -configuration Release -destination 'id=<UDID>' -allowProvisioningUpdates -allowProvisioningDeviceRegistration build` then retry `expo run:ios`. Or open **`ios/DealHub.xcworkspace`**, select the device, and **Run** once so Xcode registers the UDID. |
| **Install OK, launch failed: untrusted / Security** | [Trust the developer app](#trust-the-developer-app-first-launch-after-usb-install): tap DealHub first, then follow the alert or **Settings → General** (menu name varies). |
| **CLI exits 0 but app won’t open** | Same trust steps; confirm **Developer Mode** is on. |

**Recipient’s phone:** They must **Trust** *your* developer certificate the first time you install a build signed with your Apple ID (Personal Team). They do **not** need your eBay keys in source if you built the binary—but the binary still contains whatever `EXPO_PUBLIC_*` values were baked in at build time on your Mac.

### Install via Xcode (development / local build)

1. Open `ios/DealHub.xcworkspace` in Xcode.
2. **Signing & Capabilities:** select your **Team**; fix any errors. If you use a Personal Team, use a **unique bundle identifier** (see [Personal Team: unique bundle identifier](#personal-team-unique-bundle-identifier) above).
3. Select your **device** in the run destination menu.
4. For an install that runs **without Metro** when opened from the home screen, set the run scheme to **Release** (or use **`npm run ios:device`** instead). **Debug** on device is mainly for live reload with a reachable dev server.
5. Press **Run** (▶). Xcode builds, signs, and installs DealHub.

First launch: see [Trust the developer app](#trust-the-developer-app-first-launch-after-usb-install)—tap DealHub first; the trust entry in Settings often appears only after that alert.

### Install via TestFlight (recommended for non-developer friends)

1. Archive and upload a build to **App Store Connect** (EAS can automate this with `eas submit`).
2. Add testers in App Store Connect; they install **TestFlight** from the App Store and accept the invite.
3. They never need your eBay keys in source form if **you** built the binary—but remember the **embedded client secret** issue if they are untrusted adversaries.

### Ad Hoc IPA

1. Register each device **UDID** in the Apple Developer portal.
2. Create an **Ad Hoc** provisioning profile including those devices.
3. Export an `.ipa` signed with that profile (Xcode Organizer).
4. Deliver the IPA via **Apple Configurator**, **Finder** (macOS Catalina+), or internal MDM. TestFlight is usually simpler for small groups.

---

## Install on a physical Android device

### Enable Developer options

1. Open **Settings → About phone** (wording varies by OEM).
2. Find **Build number**.
3. Tap **Build number** seven times until you see “You are now a developer.”

### Enable USB debugging

1. Open **Settings → System → Developer options** (or **Settings → Developer options**).
2. Turn on **USB debugging**.
3. Optional: **Install via USB** / **USB debugging (Security settings)** if your OEM splits these.

### Connect and authorize

1. Connect the phone with USB.
2. On the phone, accept the **Allow USB debugging?** RSA fingerprint dialog (check “Always allow” if this is your machine).

### Verify `adb`

```bash
adb devices
```

You should see your device as `device`, not `unauthorized` or `offline`.

### Install an APK

If you have `app-release.apk` (from [Building release binaries](#building-release-binaries)):

```bash
adb install -r /path/to/app-release.apk
```

`-r` replaces an existing install.

### Sideloading without USB

- Copy the APK to the phone (AirDrop equivalent, Drive, etc.), open it in **Files**, and allow **Install unknown apps** for that source when Android prompts. OEMs (Samsung, Xiaomi, etc.) place the toggle under **Settings → Apps → Special access** or similar.

### Play Store track

- For wider distribution without “unknown sources,” use **Google Play** internal / closed testing with an **AAB** from EAS or Gradle. That path needs a **Google Play Console** developer account (see [Required accounts (self-build)](#required-accounts-self-build)).

---

## Run the app (development)

### Both simulators (recommended)

With **iOS Simulator** and **Android Emulator** running:

```bash
npm run simulators
```

Starts Metro with **`--localhost`** and opens **Expo Go** on both.

### One platform

```bash
npm run ios       # iOS Simulator + Expo Go
npm run android   # Android emulator + Expo Go (start AVD first)
```

### Interactive dev server

```bash
npm start
```

Then press **`i`** (iOS) or **`a`** (Android).

### Physical device

Same Wi‑Fi as your Mac:

```bash
npm run start:lan
```

Scan the QR code with Expo Go. If LAN is blocked, use tunnel mode: `npx expo start --tunnel`.

### Web (optional)

```bash
npm run web
```

### Typecheck (no emit)

```bash
npx tsc --noEmit
```

---

## Using the app

This is a **DealHub-branded** shopping-style shell over **eBay listings** (not an official eBay app). See [Screenshots](#screenshots) for the home screen, prize wheel, and orders list.

### Privacy and data (addresses, payments)

**Short answer for families:** DealHub does **not** send saved addresses or card details to a DealHub server—there is **no DealHub backend**. What someone enters for checkout convenience is kept **on that phone only**, except that **browsing and search** use the **eBay Browse API** (like any client using your eBay developer keys).

| What | On the phone? | Sent to DealHub servers? | Notes |
|------|---------------|--------------------------|--------|
| **Shipping addresses** (Account / checkout) | Yes — saved locally for reuse | **No** | Full address fields in device storage. |
| **Payment methods** | Yes — saved locally | **No** | **Full card numbers are not saved** — only a masked display (`**** **** **** 1234`) plus expiration/CVV fields used by the demo checkout UI (`context/AccountContext.tsx`). |
| **Profile** (name, email, avatar) | Yes | **No** | |
| **Cart, orders, store credit, theme** | Yes | **No** | |
| **Product search / item detail** | Cached in memory during use | **No** (DealHub) | Requests go to **eBay** with `EXPO_PUBLIC_EBAY_*` credentials baked into the app. |

**Checkout is not a real payment processor in this repo.** The cart → address → payment → review flow is an **illustrative** experience on top of eBay listings. DealHub does **not** charge a card or place an eBay order on the user’s behalf from here. If you need true “no card on device,” skip saving a payment method in Account and treat checkout as display-only.

**Removing data:** Delete saved addresses or cards in **Account**, or uninstall the app / clear its storage on the device. Normal **iCloud / Google device backups** may still include app data per Apple/Google policy—DealHub does not add its own cloud copy.

| Area | Behavior |
|------|-----------|
| **Home** | Category lane, search, filters/refinements, product grid; **DealHub** header, **available credit** + **prize wheel** entry; opens **Credit prize wheel** modal. |
| **Product** | Detail from eBay item id; **Add to cart** / **Buy now** (one unit per listing); images use large eBay CDN URLs when possible. |
| **Cart** | One line per listing; checkout flow (address, payment, shipping, review) and **store credit** toggle when applicable. |
| **Orders** | Saved orders from completed checkouts on device. |
| **Account** | Profile, saved **addresses** and **payment methods** (local to the phone; cards stored masked — see [Privacy and data](#privacy-and-data-addresses-payments)). **Appearance** at the bottom: **Light**, **Dark**, or **Use device setting** (default — matches the phone’s system theme). |
| **Theme** | Default **Use device setting** follows iOS/Android light–dark mode; optional fixed Light or Dark. Preference saved on device (`context/ThemePreferenceContext.tsx`). |

**Wallet / wheel:** Store credit and daily wheel flows use local persistence; see `context/WalletContext.tsx` and related components.

---

## Production and test builds (EAS)

The repo includes **`eas-cli`** and **[eas.json](eas.json)**. iOS/Android IDs in **[app.json](app.json)** default to:

- **`ios.bundleIdentifier`**: `com.dealhub.app`
- **`android.package`**: `com.dealhub.app`

Change these for **App Store / Play** branding, for **EAS** when the default id is already taken on your Expo/Apple account, and especially for **free Personal Team** device installs—use a **globally unique** bundle id (see [Personal Team: unique bundle identifier](#personal-team-unique-bundle-identifier)).

### First-time linking (required once per machine / account)

1. Create an **Expo** account at [expo.dev](https://expo.dev) if you do not already have one (free tier is enough to start).
2. From the repo root:

```bash
npx eas login
npm run eas:init
```

`eas init` creates the Expo project and adds **`expo.extra.eas.projectId`** to `app.json` — **commit that change**.

**Store uploads:** `eas submit` and **production** iOS/Android builds expect you to have completed **Apple Developer Program** and **Google Play Console** setup where applicable—see [Required accounts (self-build)](#required-accounts-self-build).

### Build profiles ([eas.json](eas.json))

| Profile | Typical use |
|---------|-------------|
| **development** | **Development client** (custom native build with dev tools); internal distribution; Android **APK**. |
| **preview** | **Internal testing**; Android **APK** for easy sideload. |
| **production** | Store-ready **iOS** / **Android** builds (configure signing in EAS / Apple / Google consoles). |

### Example commands

```bash
npm run eas:build:preview:android
npm run eas:build:preview:ios
npm run eas:build:prod:android
npm run eas:build:prod:ios
```

For **who needs which account** (eBay, Apple, Google, Expo), use [Required accounts (self-build)](#required-accounts-self-build). In short: **paid Apple** + **Play Console** matter most for **store** and **TestFlight**; **internal APKs** and **personal USB iOS** installs can often avoid Play fees and paid Apple membership.

**Docs:** [EAS Build](https://docs.expo.dev/build/introduction/), [Internal distribution](https://docs.expo.dev/build/internal-distribution/), [Submit](https://docs.expo.dev/submit/introduction/).

---

## App icons and brand assets

Expo reads paths from **[app.json](app.json)**:

| Key | File |
|-----|------|
| `expo.icon` | `assets/images/icon.png` (1024×1024) |
| `expo.android.adaptiveIcon.foregroundImage` | `assets/images/adaptive-icon.png` |
| `expo.splash.image` | `assets/images/splash-icon.png` |
| `expo.web.favicon` | `assets/images/favicon.png` |

Source artwork for multiple platforms may also live under **`DealHub_Icons/`**; replace files in **`assets/images/`** and keep `app.json` paths, or update paths to match your pipeline.

---

## Project layout

| Path | Role |
|------|------|
| `app/` | Expo Router screens, layouts, modals. |
| `components/` | Shared UI (product card, modals, form fields, etc.). |
| `context/` | React contexts: catalog, cart, account, orders, wallet, **theme preference**. |
| `constants/` | `Colors.ts` (light/dark tokens). |
| `data/` | eBay category roots, mappers, shipping options, product types. |
| `lib/` | eBay Browse client, helpers (e.g. card mask). |
| `assets/` | Images, fonts. |
| `scripts/` | `adb-reverse.sh` and other small dev helpers. |
| `app.json` / `eas.json` | Expo and EAS configuration. |
| `plugins/` | Expo config plugins (iOS signing / bundling helpers). |
| `DealHub_Icons/` | Optional source icon sizes; shipped assets under `assets/images/`. |

**Note:** Catalog traffic goes to **eBay** from the app (`lib/ebayBrowseClient.ts`). There is **no** separate DealHub backend in this repo.

---

## Command reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies. |
| `npm run simulators` | Metro (**localhost**) + iOS + Android **Expo Go**. |
| `npm start` | Metro (**localhost**); terminal menu. |
| `npm run ios` / `npm run android` | One platform + Expo Go. |
| `npm run ios:device` | Native **Release** on USB iPhone—**always add** `-- --device "<name or UDID>"` when multiple phones are paired (see [Install via CLI](#install-via-cli-recommended-for-usb)). |
| `npx expo run:ios --configuration Release --device <UDID>` | Same as above with explicit device (preferred). |
| `npm run start:lan` | LAN URL for **physical devices**. |
| `npm run android:reverse` | `adb reverse` for Metro on Android (see troubleshooting). |
| `npm run web` | Web build / dev. |
| `npx tsc --noEmit` | TypeScript check. |
| `npm run eas:login` | Log in to Expo for EAS. |
| `npm run eas:init` | Link repo to an EAS project (adds `projectId` to `app.json`). |
| `npm run eas:build:dev:ios` / `:android` | EAS **development** profile. |
| `npm run eas:build:preview:ios` / `:android` | EAS **preview** (internal; APK on Android). |
| `npm run eas:build:prod:ios` / `:android` | EAS **production** profile. |
| `npx expo start --clear --localhost` | Clear Metro cache + localhost. |

---

## Troubleshooting

### iOS: Simulator or Expo Go issues

- Open **Simulator** manually, pick a device, then run `npm run ios` again.
- Xcode **Settings → Locations → Command Line Tools** should point at your Xcode install.

### Android: No devices / install fails

- Start an **AVD** until the home screen appears.
- `adb devices` should list `device`, not `offline`.
- Set **`ANDROID_HOME`** and **`PATH`** (see [What you need installed](#what-you-need-installed)).

### Android: Expo Go home screen / empty “Development servers”

Usually **not connected** to Metro.

1. Stop old Metro; from project root: `npm run android` or `npm run simulators` (uses **`--localhost`**).
2. If it still fails, with emulator running:

   ```bash
   npm run android:reverse
   npm run android
   ```

3. Last resort: in Expo Go, **Enter URL manually** using the URL from the terminal (often `exp://127.0.0.1:8081` with localhost mode).

### One simulator works, the other does not

- Android: prefer **`npm run simulators`** / **`npm run android`**; add **`android:reverse`** if needed.
- Physical device: **`npm run start:lan`** or **`npx expo start --tunnel`**.

### Stale bundles

```bash
npx expo start --clear
```

### Dependency reset

```bash
rm -rf node_modules
npm install
```

### eBay errors in the app

- Confirm `.env` has valid **`EXPO_PUBLIC_EBAY_CLIENT_ID`** and **`EXPO_PUBLIC_EBAY_CLIENT_SECRET`**.
- Restart Metro after changing `.env` so variables reload.

### iOS: Personal Team + “Push Notifications capability” / provisioning profile errors

Apple’s **free Personal Team** cannot create a development profile for an app that includes the **Push Notifications** capability. `expo-notifications` normally injects **`aps-environment`** into the entitlements file, which triggers that capability.

This repo adds a small Expo config plugin (**[plugins/withIosNoRemotePushEntitlement.js](plugins/withIosNoRemotePushEntitlement.js)**) registered **after** `expo-notifications` in **[app.json](app.json)** so **`aps-environment` is not** in the shipped entitlements. Local scheduled notifications (used for delivery reminders) still work; **remote** push / Expo push tokens would require a **paid** Apple Developer Program membership and turning push back on intentionally.

If provisioning still fails on a **Personal Team**, also set a **unique bundle identifier** in [app.json](app.json) as described in [Personal Team: unique bundle identifier](#personal-team-unique-bundle-identifier).

If Xcode still shows **Push Notifications** under **Signing & Capabilities**, remove it with the **“−”** button, then **Product → Clean Build Folder** and build again. After changing **app.json** plugins, run **`npx expo prebuild --platform ios`** so `DealHub.entitlements` is regenerated with the plugin applied (this repo typically gitignores `ios/`; regenerate whenever you re-run prebuild from a clean tree).

### iOS device: “No script URL provided” / `unsanitizedScriptURLString = (null)`

**Meaning:** In **Debug**, the app was trying to load JavaScript from **Metro** on your Mac (`localhost` / packager URL). A physical iPhone cannot use `localhost`, so the URL is **nil** and React Native shows this error—often when you open the app from the home screen without Metro running.

**What we changed in this repo**

- **[plugins/withIosPhysicalDeviceDebugBundle.js](plugins/withIosPhysicalDeviceDebugBundle.js)** (enabled from **[app.json](app.json)**): relaxes Expo’s **skip-bundling** behavior for **Debug** so device builds can embed a bundle, and **`AppDelegate`** prefers **`main.jsbundle`** on a physical device when present. **Release** remains the reliable path for a guaranteed embedded bundle.
- After pulling changes, run **`npx expo prebuild --platform ios`** if you regenerate `ios/`, then **`npm run ios:device`** (or build **Release** from Xcode).

**If you still want Metro on a real device** (live reload): start the dev server on the LAN (**`npm run start:lan`**) so the phone can reach your Mac’s IP on port **8081**, and use the in-app developer menu to set the packager host if needed.

**Standalone install without Metro:** use **`npx expo run:ios --configuration Release --device <UDID>`** (see [Install via CLI](#install-via-cli-recommended-for-usb)).

### iOS device: “Developer Mode disabled” (Xcode error 70)

Enable **Developer Mode** on the phone ([Developer Mode (iOS 16+)](#developer-mode-ios-16)). If the toggle is missing, connect USB and attempt one Xcode or CLI install first, then check **Settings → Privacy & Security** again.

### iOS device: Provisioning profile doesn’t include device

Your **Personal Team** profile was created before this phone was registered. Connect the device, ensure **Signing & Capabilities → Automatically manage signing** in Xcode, then either:

- Build once from Xcode with that device selected, or  
- Run `xcodebuild` with **`-allowProvisioningUpdates -allowProvisioningDeviceRegistration`** (see [Install via CLI](#install-via-cli-recommended-for-usb)), then retry **`expo run:ios`**.

### iOS device: “DealHub” Is No Longer Available

**Symptom:** Tapping the DealHub icon shows **“DealHub” Is No Longer Available** (or the app will not open at all). The icon may still be on the home screen.

**Cause:** With a **free Apple ID (Personal Team)**, the development certificate and provisioning profile used to sign the app **expire after about 7 days**. iOS then treats the install as invalid until you build and install again with a fresh signature. This is expected for USB dev installs—not a bug in the app itself.

**Fix (USB, same Mac that signed the app):**

1. Connect the iPhone (**USB**, unlocked, **Trust** this computer, **Developer Mode** on — see [Developer Mode (iOS 16+)](#developer-mode-ios-16)).
2. Rebuild and reinstall a **Release** build so `main.jsbundle` is embedded (see [Install via CLI](#install-via-cli-recommended-for-usb)):

   ```bash
   xcrun xctrace list devices   # or: xcrun devicectl list devices
   npx expo run:ios --configuration Release --device "<device name or UDID>"
   ```

3. If **`expo run:ios`** fails with **no provisioning profile** or **Automatic signing is disabled**, register the device and refresh profiles with **`xcodebuild`** (from repo root, after `cd ios && pod install`):

   ```bash
   cd ios && xcodebuild -workspace DealHub.xcworkspace -scheme DealHub -configuration Release \
     -destination 'id=<UDID>' \
     -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
   ```

   Then install the built app (adjust the DerivedData folder name if yours differs — look under `~/Library/Developer/Xcode/DerivedData/DealHub-*/`):

   ```bash
   xcrun devicectl device install app --device "<device name>" \
     ~/Library/Developer/Xcode/DerivedData/DealHub-*/Build/Products/Release-iphoneos/DealHub.app
   ```

4. **Trust** the developer again if iOS blocks launch: follow [Trust the developer app](#trust-the-developer-app-first-launch-after-usb-install) (tap DealHub first; on iOS 18+ you may need **Allow & Restart**).
5. If you **changed `expo.ios.bundleIdentifier`** at some point (e.g. from `com.dealhub.app` to `com.yourname.dealhub`), you may have **two** DealHub icons. **Delete** the old one that still shows this message; open the build that matches the bundle id currently in **[app.json](app.json)** / Xcode.

**Related build errors when reinstalling:**

| Error | What to do |
|--------|------------|
| **`iOS 26.x is not installed`** (xcodebuild error **70**) | Install the matching **iOS platform** in **Xcode → Settings → Components**, or run `xcodebuild -downloadPlatform iOS`, then retry. |
| **Provisioning profile doesn’t include device** | See [Provisioning profile doesn’t include device](#ios-device-provisioning-profile-doesnt-include-device) below. |
| **Untrusted developer / invalid code signature** | Trust step in item 4 above. |

**Avoiding weekly reinstalls:** A **paid Apple Developer Program** membership, **TestFlight**, or **App Store** distribution uses longer-lived signing for testers. Personal Team USB installs are fine for your own phone but need this refresh roughly **once a week**.

### iOS device: Untrusted developer / invalid code signature on launch

Install often **succeeded**; iOS blocks **launch** until the user trusts the signing identity. The exact Settings menu name and button label (**Trust** vs **Allow & Restart**) **vary by iOS version**—do not assume **Settings → General → VPN & Device Management** exists on every phone.

**Use the full steps in [Trust the developer app](#trust-the-developer-app-first-launch-after-usb-install).** In short: **tap DealHub on the home screen first**, use any **Settings** link in the alert if shown, then look under **Settings → General** for **VPN & Device Management**, **Device Management**, or **Profiles & Device Management**. This is normal on **someone else’s** iPhone with **your** signing identity, and after fixing [**“DealHub” Is No Longer Available**](#ios-device-dealhub-is-no-longer-available).

### iOS device: Device locked

`Cannot launch … device is locked` — unlock the phone and rerun the install command; the `.app` may already be on the device.

---

## Keeping the repo current (and contributing)

Mobile tooling moves fast. A clone that worked last year may feel **out of date** today because **Xcode**, **iOS**, **Android Studio**, **Gradle**, **Expo SDK**, or **eBay’s APIs** have shifted. That does not mean the idea behind DealHub is wrong—it usually means **versions and docs need a refresh**.

### If something no longer builds or the README feels stale

1. **Run the usual health checks** from the repo root:
   - `npx expo-doctor`
   - `npx tsc --noEmit`
   - `npm install` after pulling latest `main`
2. **Compare your environment** to what the project targets (see [Overview](#overview) and `package.json` / `app.json`): current **Expo SDK**, **React Native**, **iOS deployment target**, and **Android SDK** levels.
3. **Regenerate native projects** if you use local Xcode/Gradle and templates have drifted: `npx expo prebuild --clean` (back up signing changes first).
4. **Use an AI coding agent** (Cursor, Copilot, Claude Code, etc.) with a prompt along these lines:
   - *“Read this DealHub repo. What is outdated relative to current Expo SDK, React Native, Xcode/iOS, and Android Gradle requirements? List concrete file changes and README fixes.”*
   - Ask it to cross-check **Apple’s current Xcode / iOS SDK requirements**, **Google’s compile/target SDK guidance**, and **[Expo’s upgrade docs](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)**.
   - Have it verify **eBay Browse API** env vars and auth still match [eBay’s developer docs](https://developer.ebay.com/).

An agent is useful for **scrubbing** `package.json`, config plugins, `eas.json`, and install steps—but always **run the build on a real device or simulator** before you trust the summary.

### Free to use, fork, or improve

DealHub is **free for everyone**. Use it for your own family, change the branding, or **fork** the repo and **own your copy** if you want a cadence I cannot match. You do not need permission to fork; keeping attribution in spirit of open source is appreciated but the goal is **helping people**, not gatekeeping.

### Pull requests and maintainer time

My own life is **busy and unpredictable**—I may **not** bump dependencies or rewrite docs on a fixed schedule. I **will** make time to **review thoughtful pull requests** when I can: dependency upgrades, README fixes for new iOS/Android steps, signing/plugin tweaks, and accessibility improvements are especially welcome.

**Prefer contributing here?** Open a **PR** on [github.com/j-brammer/dealhub](https://github.com/j-brammer/dealhub) with a short note of what you tested (Xcode version, iOS version, device model, etc.). **Prefer to move at your own speed?** Fork and maintain your branch for your household—no hard feelings.

---

## Links

- [Expo documentation](https://docs.expo.dev/)
- [Expo accounts (sign up)](https://expo.dev/signup)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Apple Developer Program](https://developer.apple.com/programs/) (paid membership for TestFlight / App Store)
- [Google Play Console signup](https://play.google.com/console/signup)
- [eBay Developers Program](https://developer.ebay.com/)
- [Create the eBay API keysets](https://developer.ebay.com/api-docs/static/gs_create-the-ebay-api-keysets.html)
- [OAuth credentials (client ID / secret)](https://developer.ebay.com/api-docs/static/oauth-credentials.html)
- [eBay marketplace account deletion compliance](https://developer.ebay.com/marketplace-account-deletion)
- [eBay Buy Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html)

If paths differ on your machine (e.g. Linux `ANDROID_HOME`), adjust environment variables and retry `adb devices` / `npm run simulators`.

---

*DealHub was built for my mom—with love, patience, and the hope that shopping on her phone can feel safe again.*
