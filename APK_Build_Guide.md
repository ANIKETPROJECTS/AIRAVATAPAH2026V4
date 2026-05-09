# कृषी सुविधा — Android APK Build Guide

**App Name:** कृषी सुविधा (Krushi Suvidha)  
**Package:** com.agrimh.krishisuvidha  
**API:** https://krushisuvidhaai.airavatatechnologies.com/api  

---

## Prerequisites

Before starting, make sure you have the following installed on your Windows machine:

| Tool | Download Link |
|------|--------------|
| Node.js (v18 or higher) | https://nodejs.org |

> **Note:** On Windows, use **Command Prompt** (cmd). `ls` does not work — use `dir`. `clear` does not work — use `cls`.

---

## Step 1 — Install EAS CLI

Open **Command Prompt** and run:

```cmd
npm install -g eas-cli
```

Verify it installed correctly:

```cmd
eas --version
```

You should see something like `eas-cli/18.x.x win32-x64 node-v22.x.x`.

---

## Step 2 — Create a Free Expo Account

1. Go to **https://expo.dev**
2. Click **Sign Up**
3. Fill in your name, email, and password
4. Verify your email address
5. Note down your **username** — you will need it in the next step

---

## Step 3 — Download the kisan-mitra Folder (Fresh Copy)

> ⚠️ **Always delete your old folder and download a fresh copy before each build attempt.** Every time a fix is applied in Replit, you must re-download — the old folder on your computer will NOT have the fix.

1. Open your Replit project
2. Right-click the `artifacts/kisan-mitra` folder in the file tree
3. Click **Download**
4. **Delete** your old `C:\kisan-mitra` folder first, then extract the new zip to:

```
C:\kisan-mitra\
```

After extracting, confirm these files exist inside the folder:

```
C:\kisan-mitra\
  assets\
    icon.png          ← app icon (required)
    splash.png        ← splash screen (required)
    favicon.png       ← web favicon (required)
    adaptive-icon.png ← Android adaptive icon (required)
  src\
  app.json
  eas.json
  package.json
  App.tsx
  .npmrc
```

> If the `assets\` folder is missing, the build **will fail**. Make sure you downloaded the latest version from Replit.

---

## Step 3b — (Alternative) Fix Without Re-downloading

If you do not want to re-download the whole folder, run this one command inside your existing `C:\kisan-mitra\kisan-mitra` folder to apply the latest fix:

```cmd
npm install react-native-safe-area-context@5.0.0 --legacy-peer-deps
```

Then continue with Step 8 (skip to the build command). Do **not** run `npm install` again after this — just run the build.

---

## Step 4 — Open Command Prompt in the kisan-mitra Folder

```cmd
cd C:\kisan-mitra
```

Verify you are in the right place:

```cmd
dir
```

You should see `package.json`, `app.json`, `eas.json`, `assets`, `src`.

---

## Step 5 — Install Dependencies

```cmd
npm install
```

Wait for it to finish. You will see `added 700+ packages`.

---

## Step 6 — Login to EAS

```cmd
eas login
```

Enter your **Expo username** and **password** when prompted.

> ⚠️ When it asks "Email or username", type your **username** (not your email address). If you enter your email, it will show an error about password length — just run `eas login` again and use your username.

Confirm login:

```cmd
eas whoami
```

It should display your Expo username.

---

## Step 7 — Link the Project to Your Expo Account

```cmd
eas init
```

- It will ask: **"Would you like to create a new EAS project?"** → Press `Y` and Enter
- It creates a project on your Expo dashboard and updates `app.json` with a project ID

> If you already ran `eas init` before (previous failed build), it will just re-link — that is fine.

---

## Step 8 — Build the Production APK

```cmd
eas build --platform android --profile production --no-build-cache
```

> ⚠️ Always use `--no-build-cache` to force a completely fresh build. Without it, EAS may reuse old cached packages from a previous failed build.

### What happens:
1. EAS uploads your code to Expo's cloud servers
2. Build runs entirely in the cloud — your machine does nothing
3. You will see a progress URL like:  
   `https://expo.dev/accounts/YOUR_USERNAME/projects/kisan-mitra/builds/xxxx`
4. **Build time: approximately 10–15 minutes**

### Expected build phases (all should show ✅):
- Spin up build environment
- Prepare project
- Read eas.json
- Read package.json
- Install dependencies
- Read app config
- Run expo doctor
- Prebuild
- **Run gradlew** ← this was failing before, now fixed
- Upload build artifacts

---

## Step 9 — Download the APK

Once the build shows **Finished**:

1. Open the build URL from your terminal  
   *(or go to https://expo.dev → your account → Projects → kisan-mitra → Builds)*
2. Click **Download** next to the completed build
3. You get a file like `kisan-mitra-production.apk`

---

## Step 10 — Install the APK on an Android Phone

### Method A — Direct USB Transfer
1. Connect phone to PC via USB
2. Allow **File Transfer** mode on the phone
3. Copy the `.apk` to the phone's Downloads folder
4. On the phone: open **Files** app → Downloads → tap the APK
5. If blocked: **Settings → Apps → Special App Access → Install Unknown Apps** → enable for Files app
6. Tap **Install**

### Method B — Google Drive / WhatsApp
1. Upload the `.apk` to Google Drive or send to yourself on WhatsApp
2. Open on the Android phone and install

---

## What the App Does After Installation

Once installed, the कृषी सुविधा app:

- Connects to your live VPS at `https://krushisuvidhaai.airavatatechnologies.com/api`
- Farmers log in with mobile number + OTP
- Upload documents (Aadhaar, Bank Passbook, Form 7, Form 12, Form 8A)
- View government schemes, subsidies, and insurance
- Raise and track grievances
- Receive notifications from the admin panel

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Gradle build failed / Run gradlew error** | Re-download a fresh copy of kisan-mitra from Replit — both the New Architecture fix and the safe-area-context v5 upgrade are now included |
| **`compileReleaseKotlin FAILED` / SafeAreaProviderManager error** | Re-download kisan-mitra from Replit — `react-native-safe-area-context` has been upgraded to v5 which fixes this |
| **Prebuild failed** | Re-download kisan-mitra from Replit (fresh copy) — make sure the assets folder is present |
| `npm install` gives `ERESOLVE` | The `.npmrc` file handles this automatically. If still failing, run `npm install --legacy-peer-deps` |
| `eas: command not found` | Run `npm install -g eas-cli`, then close and reopen Command Prompt |
| Login error "password must contain 1 char" | Use your Expo **username** not your email address when logging in |
| `Not logged in` | Run `eas login` again |
| APK installs but cannot connect | Verify nginx on your VPS is proxying `/api/` → `localhost:3014` and the API server is running |
| `Install blocked` on phone | Settings → Apps → Special App Access → Install Unknown Apps → enable for Files |
| `ls` not working | Use `dir` on Windows instead |

---

## Rebuilding After Code Changes

1. Download a fresh copy of `artifacts/kisan-mitra` from Replit
2. Open Command Prompt in that folder
3. Run:

```cmd
npm install
eas build --platform android --profile production --no-build-cache
```

You do **not** need to run `eas init` again — it only needs to be done once.

---

## May 2026 Update — All Bug Fixes

### Fix 1 — Document Upload "Network request failed" (Android)

**Root cause:** `typeof window !== 'undefined'` is always `true` in React Native (window is polyfilled), so the app was incorrectly treating Android as a web browser and trying to `fetch()` a local `file://` URI instead of attaching it as a blob to FormData.

**Fix:** Changed the platform check to `Platform.OS === 'web'` in `api.ts → uploadDocument`. On Android, the file URI is now appended directly as a `{ uri, name, type }` native blob — the correct React Native approach.

---

### Fix 2 — Profile Screen Shows Only "Personal Details" (Android)

**Root cause:** The production VPS API returns OCR data inside `extractionData` (nested sections/fields format) but does not always merge it back into the flat `ocr` field that the profile screen reads. The local Replit dev server does this merge server-side; the VPS did not.

**Fix:** Added a `deriveOcrFromExtractionData()` function (client-side mirror of the server logic) in `api.ts`. It is now called in **three** places in `AuthContext.tsx`:
1. **On app boot** — when restoring session from AsyncStorage
2. **On OTP login** — immediately after `verifyOtp` returns farmer data
3. **On `refreshFarmer`** — when the app polls the latest farmer record from the API

This ensures the profile screen always has populated OCR sections regardless of which API version is running on the VPS.

---

### Fix 3 — On-Screen Debug Log Panel

A collapsible debug log panel (`🔧 Debug Log`) now appears on the Document Upload screen after the first upload attempt. It shows:
- `Platform.OS` and the API base URL being used
- The file name, MIME type, and first 40 chars of the URI for each upload
- Success (request ID) or full error message

This lets you diagnose any future upload issues directly from the device without needing a computer or USB cable.

---

## API Routing (Mobile App)

All requests from the Android APK go **exclusively** to:

```
https://krushisuvidhaai.airavatatechnologies.com/api
```

This is hardcoded as `PRODUCTION_API` in `api.ts` and is selected whenever `Platform.OS !== 'web'`. The web preview on port 8008 continues to use the local Replit API at `${hostname}:8000/api`.

---

## Important Notes

- The APK always calls `https://krushisuvidhaai.airavatatechnologies.com/api` — your live VPS
- You do **not** need Android Studio, Java, or Android SDK — Expo builds in the cloud
- Each build uses ~10–15 minutes of your free Expo build quota
- To test with a local server, use `--profile development` instead

---

*Document prepared for Airavata Technologies — Krushi Suvidha Project*
