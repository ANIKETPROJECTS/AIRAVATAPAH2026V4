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
| Git | https://git-scm.com |

---

## Step 1 — Install EAS CLI

Open **Command Prompt** or **PowerShell** and run:

```bash
npm install -g eas-cli
```

Verify it installed correctly:

```bash
eas --version
```

You should see a version number like `eas-cli/16.x.x`.

---

## Step 2 — Create a Free Expo Account

1. Go to **https://expo.dev**
2. Click **Sign Up**
3. Fill in your name, email, and password
4. Verify your email address
5. Note down your **username** — you will need it in the next step

> The free Expo account gives you enough build minutes to generate the APK at no cost.

---

## Step 3 — Get the kisan-mitra Folder

You need the `artifacts/kisan-mitra` folder from your project. You can get it in one of two ways:

**Option A — Download from Replit:**
1. Open your Replit project
2. Right-click the `artifacts/kisan-mitra` folder
3. Click **Download**
4. Extract the zip on your machine

**Option B — Copy from your VPS:**
```bash
scp -r user@your-vps-ip:/path/to/project/artifacts/kisan-mitra C:\krushi-build\kisan-mitra
```

---

## Step 4 — Open the kisan-mitra Folder in Terminal

```bash
cd C:\krushi-build\kisan-mitra
```

> Replace `C:\krushi-build\kisan-mitra` with the actual path where you extracted the folder.

---

## Step 5 — Install Dependencies

```bash
npm install
```

Wait for it to finish. You will see a message like `added 1000+ packages`.

---

## Step 6 — Login to EAS

```bash
eas login
```

Enter your **Expo username** and **password** when prompted.

Confirm login was successful:

```bash
eas whoami
```

It should show your Expo username.

---

## Step 7 — Link the Project to Your Expo Account

```bash
eas init
```

- It will ask: **"Would you like to create a new EAS project?"** → Press `Y` and Enter
- It will create a project called `kisan-mitra` on your Expo account
- This will add an `extra.eas.projectId` to your `app.json` automatically

---

## Step 8 — Build the Production APK

```bash
eas build --platform android --profile production
```

### What happens next:
1. EAS uploads your project code to Expo's cloud build servers
2. The build runs entirely in the cloud — your machine can stay idle
3. You will see a progress URL like:  
   `https://expo.dev/accounts/YOUR_USERNAME/projects/kisan-mitra/builds/xxxx`
4. **Build time: approximately 5–15 minutes**

---

## Step 9 — Download the APK

Once the build is complete:

1. Open the build URL shown in your terminal (or go to https://expo.dev → your project → Builds)
2. Click **Download** next to the completed build
3. You will get a file named something like `kisan-mitra-production.apk`

---

## Step 10 — Install the APK on an Android Phone

### Method A — Direct USB Transfer
1. Connect the Android phone to your computer via USB
2. Copy the `.apk` file to the phone's storage
3. On the phone, open **Files** app → find the APK → tap it
4. If prompted, enable **"Install from Unknown Sources"** in Settings
5. Tap **Install**

### Method B — Share via WhatsApp / Google Drive
1. Upload the `.apk` to Google Drive or WhatsApp
2. Download it on the Android phone
3. Tap the downloaded file to install

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
| `eas: command not found` | Run `npm install -g eas-cli` again, restart terminal |
| `Not logged in` | Run `eas login` again |
| Build fails with dependency error | Delete `node_modules` folder and run `npm install` again |
| APK installs but can't connect | Check that nginx is running on your VPS and `/api/` is proxied to port `3014` |
| `Install blocked` on phone | Go to Settings → Security → Enable "Install Unknown Apps" for your file manager |

---

## Rebuilding After Code Changes

Whenever you update the mobile app code, repeat only **Steps 4 and 8**:

```bash
cd C:\krushi-build\kisan-mitra
eas build --platform android --profile production
```

Each build creates a new APK download link on your Expo dashboard.

---

## Important Notes

- The APK built with `--profile production` has your live domain baked in — it will **always** call `https://krushisuvidhaai.airavatatechnologies.com/api`
- To test with a local API server, use `--profile development` instead
- Your Expo free account gets limited build minutes per month — each APK build uses approximately 10–15 minutes
- You do **not** need Android Studio, Java, or any Android SDK installed locally — all compilation happens on Expo's servers

---

*Document prepared for Airavata Technologies — Krushi Suvidha Project*
