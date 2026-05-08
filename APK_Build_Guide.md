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

> **Note:** On Windows, use **Command Prompt** (cmd). `ls` does not work on Windows — use `dir` instead. `clear` does not work on Windows — use `cls` instead.

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

> The free Expo account gives you enough build minutes to generate the APK at no cost.

---

## Step 3 — Download the kisan-mitra Folder

You need the `artifacts/kisan-mitra` folder from your Replit project.

1. Open your Replit project
2. Right-click the `artifacts/kisan-mitra` folder in the file tree
3. Click **Download**
4. A zip file will be downloaded — extract it to a folder on your machine

For example, extract it so the path looks like:
```
C:\kisan-mitra\
```

> Make sure you are inside the folder that contains `package.json`, `app.json`, `eas.json`, `App.tsx` etc. — not inside an extra nested folder.

---

## Step 4 — Open Command Prompt in the kisan-mitra Folder

```cmd
cd C:\kisan-mitra
```

Confirm you are in the right folder by listing its contents:

```cmd
dir
```

You should see files like: `package.json`, `app.json`, `eas.json`, `App.tsx`, `src`

---

## Step 5 — Install Dependencies

```cmd
npm install
```

> This will work without errors because the folder already includes a `.npmrc` file that handles the React version conflict automatically. If you previously got an `ERESOLVE` error, it was because you were using an older download of the folder — **re-download it from Replit** and try again.

Wait for it to finish. You will see a message like `added 1000+ packages`.

---

## Step 6 — Login to EAS

```cmd
eas login
```

Enter your **Expo username** and **password** when prompted.

Confirm login was successful:

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
- It will create a project called `kisan-mitra` on your Expo account
- This adds a project ID to your `app.json` automatically — this is normal

---

## Step 8 — Build the Production APK

```cmd
eas build --platform android --profile production
```

### What happens next:
1. EAS uploads your project code to Expo's cloud build servers
2. The build runs entirely in the cloud — your machine does nothing and can stay idle
3. You will see a progress URL like:  
   `https://expo.dev/accounts/YOUR_USERNAME/projects/kisan-mitra/builds/xxxx`
4. **Build time: approximately 5–15 minutes**

---

## Step 9 — Download the APK

Once the build is complete:

1. Open the build URL shown in your terminal  
   *(or go to https://expo.dev → your account → Projects → kisan-mitra → Builds)*
2. Click **Download** next to the completed build
3. You will get a file like `kisan-mitra-production.apk`

---

## Step 10 — Install the APK on an Android Phone

### Method A — Direct USB Transfer
1. Connect the Android phone to your PC via USB cable
2. On the phone, allow **File Transfer** mode
3. Copy the `.apk` file to the phone's storage (e.g. Downloads folder)
4. On the phone, open the **Files** app → navigate to Downloads → tap the APK
5. If prompted about **"Install from Unknown Sources"**:  
   Go to **Settings → Apps → Special App Access → Install Unknown Apps**  
   → Enable for your file manager
6. Tap **Install**

### Method B — Share via WhatsApp / Google Drive
1. Upload the `.apk` to Google Drive or send via WhatsApp to yourself
2. Download it on the Android phone
3. Tap the downloaded file and install

---

## What the App Does After Installation

Once installed, the कृषी सुविधा app will:

- Connect to your live API at `https://krushisuvidhaai.airavatatechnologies.com/api`
- Allow farmers to log in with their mobile number + OTP
- Upload documents (Aadhaar, Bank Passbook, Form 7, Form 12, Form 8A)
- View government schemes, subsidies, and insurance options
- Raise and track grievances
- Receive notifications from the admin panel

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` gives `ERESOLVE` error | Re-download the kisan-mitra folder from Replit (the new version includes a fix). Or run `npm install --legacy-peer-deps` |
| `eas: command not found` | Run `npm install -g eas-cli` again, then close and reopen Command Prompt |
| `Not logged in` | Run `eas login` again |
| Build fails on Expo cloud | Go to the build URL and check the logs — usually a missing dependency |
| APK installs but cannot connect to server | Check that nginx on your VPS is proxying `/api/` to `localhost:3014` |
| `Install blocked` on phone | Settings → Apps → Special App Access → Install Unknown Apps → enable for Files app |
| `ls` not working in Command Prompt | Use `dir` instead — `ls` is a Linux command, not available in Windows cmd |

---

## Rebuilding After Code Changes

Whenever you update the mobile app code and download a fresh copy, navigate into the folder and run:

```cmd
npm install
eas build --platform android --profile production
```

Each build creates a new APK download link on your Expo dashboard.

---

## Important Notes

- The APK built with `--profile production` always calls `https://krushisuvidhaai.airavatatechnologies.com/api` — your live VPS
- To test with a local API server during development, use `--profile development` instead
- You do **not** need Android Studio, Java, or any Android SDK — all compilation happens on Expo's cloud servers
- Your Expo free account has limited build minutes per month — each APK build uses approximately 10–15 minutes

---

*Document prepared for Airavata Technologies — Krushi Suvidha Project*
