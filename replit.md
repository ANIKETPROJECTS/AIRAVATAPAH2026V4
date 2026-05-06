# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB Atlas
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm --filter @workspace/agri-admin run dev` — run admin web app locally (port 5000)
- `pnpm --filter @workspace/kisan-mitra run web` — run Kisan Mitra Expo web app (port 8008)
- `pnpm --filter @workspace/api-server run build && PORT=8000 node artifacts/api-server/dist/index.mjs` — run API server

## Artifacts

### AgriAdmin AI — Smart Agriculture Dashboard (`artifacts/agri-admin`)

- **Type**: React + Vite frontend app
- **Port**: 5000 (webview workflow "Start application")
- **Description**: Maharashtra district officer portal — manage farmer registrations, scheme applications, OCR extraction, subsidies, grievances
- **Tech**: React 19, react-router-dom, Tailwind v3, shadcn/ui, Recharts, DM Sans/DM Serif Display fonts
- **Key screens**: Dashboard, New Registration (OCR wizard), Farmer Registry, Scheme Applications, Subsidy Applications (was "Subsidy Management"), Insurance Claim Applications (was "Insurance Claims"), Grievance Management, Reports & Analytics, Farmer App Preview
- **Sidebar groups**: "Applications" hover-flyout → Scheme Applications / Subsidy Applications / Insurance Claim Applications; "Database" hover-flyout → All Schemes / All Insurance / All Subsidies
- **New Registration module**: 5 document upload cards (Form 7, Form 12, Form 8A, Aadhaar, Bank Passbook); uploads to `/api/extract`, polls `/api/extract/:requestId`, displays structured extracted fields, auto-saves to MongoDB when phone provided
- **Language switching**: Marathi/Hindi/English on New Registration page. Translation maps: `SECTION_TITLE_MAP`, `PROFILE_FIELD_LABEL_MAP`, `PROFILE_SECTION_DOC_LABELS`, `FIELD_LABEL_MAP`, `UI_T`. Helpers: `ui()`, `tSec()`, `tField()`, `tProfileField()`

### API Server (`artifacts/api-server`)

- **Type**: Express 5 API server
- **Port**: 8000 (console workflow "API Server")
- **Routes**:
  - `GET /api/document-types` — list 5 supported document types
  - `POST /api/extract` — upload file (multipart: `file`, `document_type`, `mode`, `profile_phone`); returns `request_id`
  - `GET /api/extract/:requestId` — poll OCR result; auto-saves to MongoDB when `profile_phone` provided
  - `POST /api/auth/send-otp` — send 6-digit OTP to mobile (returns `otp` field in dev mode)
  - `POST /api/auth/verify-otp` — verify OTP, return JWT + farmer data
  - `GET /api/farmers` — list farmers (query: `status`, `search`, `district`, `page`, `limit`)
  - `GET /api/farmers/by-phone/:phone` — look up farmer by mobile number
  - `GET /api/farmers/:id` — get farmer by farmerId
  - `POST /api/farmers` — create new farmer
  - `PATCH /api/farmers/:id` — update farmer
  - `GET /api/schemes` — list government schemes (query: `type`, `search`)
  - `GET /api/notifications` — list notifications (query: `mobile`, `farmerId`, `unreadOnly`)
  - `POST /api/notifications/send` — create + push notification
  - `PATCH /api/notifications/:id/read` — mark notification as read
  - `PATCH /api/notifications/read-all` — mark all notifications read (body: `mobile`)
  - `GET /api/grievances` — list grievances (query: `mobile`, `farmerId`, `status`, `search`)
  - `GET /api/grievances/:id` — get single grievance
  - `POST /api/grievances` — create grievance (body: `mobile`, `farmerId`, `farmerName`, `category`, `customCategory`, `subject`, `description`, `attachments[]`, `source`, `raisedBy`, `priority`)
  - `PATCH /api/grievances/:id` — update grievance (body: `status`, `adminReply`, `adminNotes`, `priority`, `assignedTo`, `resolvedAt`, `rejectionReason`)
  - `DELETE /api/grievances/:id` — delete grievance by grievanceId
- **MongoDB**: Atlas cluster (`apnaapp` DB); collections: `farmers`, `users`, `schemes`, `push_tokens`, `otps`, `extract_requests`, `grievances`
- **Embedded in farmer doc**: `notifications[]` (all notification objects) and `documents[]` (base64 doc images) — no separate collections for these
- **Secrets**: `DATALAB_API_KEY`, `MONGODB_URI`, `SESSION_SECRET`

### Kisan Mitra — Farmer Mobile App (`artifacts/kisan-mitra`)

- **Type**: Expo (React Native) app running in web mode for preview
- **Port**: 8008 (console workflow "Kisan Mitra")
- **App name**: "कृषी सुविधा" (Krushi Suvidha) — renamed from Kisan Mitra across all screens
- **Tech**: Expo SDK 53, React Native 0.79.2, React Navigation v6 (stack + bottom tabs), React 19, no expo-router
- **Colors**: Green theme matching admin panel — primaryDark `#14532D` (headers/heroes), primary `#16A34A` (buttons/active), gold `#D97706` (brand text/accents), white cards on `#F8FAFC` background
- **Languages**: English, Hindi (हिंदी), Marathi (मराठी) — switchable on welcome screen, saved in AsyncStorage
- **Auth**: Mobile OTP login via `/api/auth/send-otp` + `/api/auth/verify-otp`; JWT + farmer data stored in AsyncStorage. Dev mode: OTP auto-displayed in yellow banner on OTP screen (API returns it in response).
- **Navigation flow**:
  - No token → Welcome → Login → OTP
  - Token + no farmer / Rejected → DocumentUpload
  - Token + farmer Pending → PendingScreen (auto-polls every 30s)
  - Token + farmer Active → Main tab navigator (Home / Schemes / Notifications / **Analytics** / Profile)
- **Document upload**: 5 required documents (Aadhaar, Bank Passbook, Form 7, Form 12, Form 8A). Each card: pick file (expo-document-picker on web, expo-image-picker on native) → POST `/api/extract` with `profile_phone` → poll `/api/extract/:requestId` every 4s → marks done when `status === 'complete'`. Submit button enabled when all 5 done — fetches updated farmer record and navigates to Pending.
- **Screens**:
  - `WelcomeScreen` — Dark forest green hero, 🌾 logo, gold कृषी सुविधा title, language pills, green CTA
  - `LoginScreen` — Dark green top bar with gold brand, mobile number input card, green send button
  - `OtpScreen` — Dark green top bar, OTP input with dot indicators, dev OTP tap-to-fill banner
  - `DocumentUploadScreen` — Progress card with segment bar, 5 doc cards with colored upload buttons, green submit
  - `PendingScreen` — Dark green ID card, timeline stepper (primary/gold states), docs list, refresh button
  - `RejectedScreen` — Dark green ID card, numbered steps card, help center card with helpline
  - `VerifiedScreen` — Animated green checkmark, ID card, benefits list, auto-redirect to dashboard
  - `HomeScreen` (tab) — Dark green hero card with avatar, farm stats grid, quick action grid, weather advisory
  - `SchemesScreen` (tab) — Dark green top bar, tab switcher (Schemes/Insurance/Subsidies), filter chips, eligible badges
  - `NotificationsScreen` (tab) — Dark green top bar, unread banner, colored notification cards with type icons
  - `AnalyticsScreen` (tab) — NEW: Farm overview stats, scheme statistics, category bar chart, registration timeline, doc progress
  - `ProfileScreen` (tab) — Dark green hero with gold farmer ID badge, color-coded section cards, green KYC badge; "📢 Raise Grievance" gold button navigates to GrievanceScreen
  - `GrievanceScreen` (stack) — Category chips, subject auto-fill, description textarea, optional attachment; shows "My Previous Grievances" list with 👁 View / ✏️ Edit (Open only) / 🗑 Delete (Open or Rejected) action buttons per row
  - `GrievanceDetailScreen` (stack) — Full grievance detail view; shows status, priority, description, admin reply, rejection reason; edit mode (Open grievances only) lets farmer update category/subject/description
- **API URL Strategy**: `getApiBase()` in `src/api.ts` — if `localhost` → `http://localhost:8000/api`; otherwise `${protocol}//${hostname}:8000/api` (works in Replit since all ports are accessible at the same hostname)
- **Key files**: `src/api.ts`, `src/types.ts`, `src/constants.ts`, `src/context/AuthContext.tsx`, `src/navigation/AppNavigator.tsx`, `src/screens/`

## Port Routing
- **Port 5000**: Vite dev server (agri-admin frontend) — webview workflow
- **Port 8000**: API server (Express) — console workflow
- **Port 8008**: Expo Metro web (kisan-mitra) — console workflow
- **Port 8080→5000 / Port 18593→5000**: Redirect handled by `scripts/redirect-8080.mjs`

## Architecture Notes
- Admin app (agri-admin) and Farmer app (kisan-mitra) both call the same API server on port 8000
- Admin app uses Vite proxy (`/api` → `http://localhost:8000`) — same-origin requests
- Kisan Mitra derives API URL dynamically from `window.location.hostname:8000` at runtime
- MongoDB collections shared between all apps: `farmers` (with embedded `notifications[]` and `documents[]`), `schemes`, `push_tokens`
- Expo Push Notifications: farmers register push tokens; admin triggers push via `/api/notifications/send`
- OTP is returned in API response in dev mode (no SMS gateway) — displayed as yellow banner in OtpScreen
- Document types: `aadhar`, `bank_passbook`, `form7`, `form12`, `form8a`
