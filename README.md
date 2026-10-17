# AmigoTap Owner App

Expo (SDK 58) app for AmigoTap business owners, built from the *AmigoTap Owner App* design. It runs on the same
**linktree Supabase project** as `amigotap.com/linktree`, so every change goes live on the owner's page immediately.

## What's in it

| Area | Screens |
| --- | --- |
| Sign in | Splash, login (wrong-password state, 3-try / 5-minute pause, reset email) |
| Businesses | Picker with views today + new-order dots, switch-business sheet |
| Home | Today vs yesterday tiles, pending-orders banner, 7-day views, quick actions |
| Orders (restaurants) | Live feed (Supabase realtime + 10 s poll), New / Preparing / Ready / Done, order sheet with timeline, new-order toast + ding + haptic |
| Links (link pages) | Drag to reorder, show/hide, long-press to remove, click counts, Add-a-link sheet that formats WhatsApp / phone / email / handles |
| Menu (restaurants) | Items by category, sold-out toggle, edit/add item with photo upload, tables with their own QR codes |
| Stats | Orders: revenue, orders, avg order, busiest table, revenue line, orders by hour/table, top items · Page: views & clicks, per-link CTR |
| QR & NFC | AmigoTap-design QR (PNG/SVG export), NFC tag link, **write the link to a tag in-app** |
| More | Team access (invite a manager), order sound / vibrate, reset password, log out |

### Tap to share (phone → phone, like an NFC card)

**Profile → Tap to share** turns the owner's phone into an NFC card for the current business:

- **Android:** the app emulates an NFC Forum Type 4 tag (host card emulation) that holds
  `https://amigotap.com/linktree/<slug>?src=nfc`. Any phone that touches it opens the page:
  the browser shows the web's tap welcome popup, iPhones with the App Clip set up open the clip,
  and phones with this app installed open it in-app. The code is in `modules/amigo-hce`
  (Kotlin `HostApduService`), and it only answers readers while that screen is open.
- **iPhone:** Apple doesn't let third-party apps emulate NFC tags, so the same screen shows a full-screen QR
  for the other person's camera, a share-link button, and **Write my page to an NFC card**.

**Profile → Read a card** reads an AmigoTap card, table stand, or a phone that's sharing, and opens it in the app.

### App Clip (iOS)

`react-native-app-clip` adds an `AmigoTapClip` target (`com.amigotap.owner.Clip`). When someone without the app taps
an AmigoTap card or scans its QR on an iPhone, iOS can open the clip straight onto
`/linktree/<slug>`: a native card with the page's links, an "Open full page" button, and Apple's
"Get the full app" banner. The clip never signs anyone in, and NFC, audio, the image picker and the dev client are left out
of its build to stay under the 15 MB limit.

## Run it

```bash
cp .env.example .env          # fill EXPO_PUBLIC_SUPABASE_ANON_KEY (the web's NEXT_PUBLIC_LINKTREE_SUPABASE_ANON_KEY)
npm install
npx expo prebuild --clean
npx expo run:ios              # or: npx expo run:android --device
npm run clip                  # build + launch the App Clip scheme in the simulator
```

NFC needs a physical phone and a development build. Expo Go can't load the NFC or HCE native code.
Check with `npm run typecheck`, `npx expo lint` and `npx expo-doctor`.

## Before release

1. **Apple Developer:** register `com.amigotap.owner` (NFC Tag Reading + Associated Domains) and the App Clip ID
   `com.amigotap.owner.Clip` (parent: the app, product name **Clip**).
2. **Serve the association file** from the web app at
   `https://amigotap.com/.well-known/apple-app-site-association` (JSON, no redirect). The template is in
   `docs/well-known/apple-app-site-association`; replace `TEAMID` with your Apple Team ID. It excludes `/linktree/admin`,
   `/linktree/login` and table-order paths, so those keep opening on the web.
3. **App Store Connect → App Clip experiences:** add a default experience for `https://amigotap.com/linktree/`
   (and advanced experiences per business if you want custom header images).
4. Android needs nothing extra: receiving phones open the link in the browser.

## Layout

```
src/app/            routes (expo-router): (tabs)/ home orders links stats profile more, sheets, linktree/[slug] (public / App Clip)
src/providers/      auth, business (list + current + prefs), orders (realtime feed + alerts)
src/lib/            data.ts (all Supabase queries), qr.ts (QR design port), nfc.ts, clip.ts, platforms.ts, format.ts
src/components/     ui kit (buttons, inputs, chips, tiles, toggles), charts, QR, toast
modules/amigo-hce/  local Expo module: Android NFC card emulation
```
