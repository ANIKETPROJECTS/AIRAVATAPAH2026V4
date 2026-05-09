import { Platform } from 'react-native';
import { Farmer, Notification, Scheme, InsuranceSubsidy, Application } from './types';

const PRODUCTION_API = 'https://krushisuvidhaai.airavatatechnologies.com/api';

function getApiBase(): string {
  const override = process.env['EXPO_PUBLIC_API_BASE_URL'];
  if (override) return override;

  if (Platform.OS !== 'web') {
    return PRODUCTION_API;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:8000/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }
  // All non-localhost environments (Replit preview, VPS web, etc.) use the production API
  // so both the web preview and the APK always talk to the same database.
  return PRODUCTION_API;
}

export const API_BASE = getApiBase();

const DOC_ID_TO_OCR_SECTION: Record<string, string> = {
  aadhar: 'aadhar',
  bank_passbook: 'passbook',
  form7: 'form7',
  form12: 'form12',
  form8a: 'form8a',
};

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

type ExtractionField = { key: string; label: string; value: string };
type ExtractionSection = { title?: string; fields?: ExtractionField[] };
type ExtractionDataEntry = { sections?: ExtractionSection[] };

export function deriveOcrFromExtractionData(farmer: Record<string, unknown>): void {
  const ocr = (farmer['ocr'] as Record<string, unknown>) ?? {};
  const extractionData = (farmer['extractionData'] as Record<string, ExtractionDataEntry>) ?? {};

  for (const [docId, data] of Object.entries(extractionData)) {
    const section = DOC_ID_TO_OCR_SECTION[docId];
    if (!section) continue;
    const existing = ocr[section];
    if (existing && typeof existing === 'object' && Object.keys(existing as object).length > 0) continue;
    const fields: Record<string, string> = {};
    for (const sec of (data.sections ?? [])) {
      for (const f of (sec.fields ?? [])) {
        if (f.value && f.value.trim() && f.value !== '—') {
          fields[snakeToCamel(f.key)] = f.value;
        }
      }
    }
    if (Object.keys(fields).length > 0) ocr[section] = fields;
  }

  farmer['ocr'] = ocr;
}

function hasData(v: unknown): boolean {
  return v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '—';
}

/**
 * Enriches farmer.ocr by:
 * 1. Deriving from extractionData sections (if the API returned them)
 * 2. Falling back to top-level farmer fields (name, aadhaar, bankName, etc.)
 *    so older VPS API versions that don't return full OCR still show profile data.
 */
export function enrichFarmerOcr(farmer: Record<string, unknown>): void {
  deriveOcrFromExtractionData(farmer);

  const ocr = (farmer['ocr'] as Record<string, unknown>) ?? {};

  // Aadhaar section fallback
  const existingAadhar = ocr['aadhar'] as Record<string, unknown> | undefined;
  if (!existingAadhar || Object.keys(existingAadhar).length === 0) {
    const f: Record<string, string> = {};
    if (hasData(farmer['name'])) f['name'] = String(farmer['name']);
    if (hasData(farmer['aadhaar'])) f['aadhaarNumber'] = String(farmer['aadhaar']);
    if (hasData(farmer['dob'])) f['dateOfBirth'] = String(farmer['dob']);
    if (hasData(farmer['gender'])) f['gender'] = String(farmer['gender']);
    if (hasData(farmer['fatherName'])) f['fathersOrHusbandsName'] = String(farmer['fatherName']);
    if (hasData(farmer['address'])) f['address'] = String(farmer['address']);
    if (hasData(farmer['aadhaarMobile'])) f['mobileNumber'] = String(farmer['aadhaarMobile']);
    if (Object.keys(f).length > 0) ocr['aadhar'] = f;
  }

  // Bank Passbook section fallback
  const existingPassbook = ocr['passbook'] as Record<string, unknown> | undefined;
  if (!existingPassbook || Object.keys(existingPassbook).length === 0) {
    const f: Record<string, string> = {};
    if (hasData(farmer['bankName'])) f['bankName'] = String(farmer['bankName']);
    if (hasData(farmer['branchName'])) f['branchName'] = String(farmer['branchName']);
    if (hasData(farmer['ifsc'])) f['ifsc'] = String(farmer['ifsc']);
    if (hasData(farmer['bankAccount'])) f['accountNumber'] = String(farmer['bankAccount']);
    if (hasData(farmer['accountType'])) f['accountType'] = String(farmer['accountType']);
    if (Object.keys(f).length > 0) ocr['passbook'] = f;
  }

  // Form 7 section fallback (land record data shared with form12 and form8a)
  const landFields = (): Record<string, string> => {
    const f: Record<string, string> = {};
    if (hasData(farmer['village'])) f['village'] = String(farmer['village']);
    if (hasData(farmer['district'])) f['district'] = String(farmer['district']);
    if (hasData(farmer['taluka'])) f['taluka'] = String(farmer['taluka']);
    if (hasData(farmer['surveyNumber'])) f['surveyNumber'] = String(farmer['surveyNumber']);
    if (hasData(farmer['land'])) f['totalArea'] = String(farmer['land']);
    return f;
  };

  const existingForm7 = ocr['form7'] as Record<string, unknown> | undefined;
  if (!existingForm7 || Object.keys(existingForm7).length === 0) {
    const f = landFields();
    if (Object.keys(f).length > 0) ocr['form7'] = f;
  }

  const existingForm12 = ocr['form12'] as Record<string, unknown> | undefined;
  if (!existingForm12 || Object.keys(existingForm12).length === 0) {
    const f = landFields();
    if (hasData(farmer['crop'])) f['crop'] = String(farmer['crop']);
    if (Object.keys(f).length > 0) ocr['form12'] = f;
  }

  const existingForm8a = ocr['form8a'] as Record<string, unknown> | undefined;
  if (!existingForm8a || Object.keys(existingForm8a).length === 0) {
    const f = landFields();
    if (Object.keys(f).length > 0) ocr['form8a'] = f;
  }

  farmer['ocr'] = ocr;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as Record<string, string>).error ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export interface SendOtpResult {
  success: boolean;
  otp?: string;
  expiresIn: number;
  message?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  token: string;
  farmer: Farmer | null;
  isRegistered: boolean;
}

export interface ExtractSubmitResult {
  request_id: string;
  document_type: string;
  document_label: string;
  mode: string;
  profile_phone: string | null;
  pipelines: Record<string, { status: string; error?: string }>;
}

export interface ExtractPollResult {
  status: 'processing' | 'complete' | 'error';
  document_type: string;
  document_label?: string;
  profile?: { phone: string; section: string | null; saved: boolean; error: string | null };
  error?: string;
}

export interface GrievanceRecord {
  grievanceId: string;
  mobile: string;
  farmerId: string | null;
  farmerName: string | null;
  category: string;
  subject: string;
  description: string;
  attachments: Array<{ name: string; base64: string; mimeType: string }>;
  status: string;
  priority: string;
  assignedTo: string | null;
  adminReply: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  resolvedAt: string | null;
  source: string;
  raisedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  sendOtp: (mobile: string) =>
    request<SendOtpResult>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    }),

  verifyOtp: (mobile: string, otp: string) =>
    request<VerifyOtpResult>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    }),

  getFarmerByPhone: (phone: string) =>
    request<Farmer>(`/farmers/by-phone/${phone}`),

  uploadDocument: async (
    fileUri: string,
    fileName: string,
    fileMime: string,
    documentType: string,
    profilePhone: string,
  ): Promise<ExtractSubmitResult> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: fileMime,
      } as unknown as Blob);
    }

    formData.append('document_type', documentType);
    formData.append('profile_phone', profilePhone);
    formData.append('mode', 'accurate');

    const res = await fetch(`${API_BASE}/extract`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errMsg = 'Upload failed';
      try {
        const errBody = await res.json();
        errMsg = errBody.error ?? errMsg;
      } catch {}
      throw new Error(`[HTTP ${res.status}] ${errMsg} — API: ${API_BASE}`);
    }
    return res.json() as Promise<ExtractSubmitResult>;
  },

  pollExtraction: (requestId: string) =>
    request<ExtractPollResult>(`/extract/${requestId}`),

  getNotifications: (mobile: string) =>
    request<Notification[]>(`/notifications?mobile=${encodeURIComponent(mobile)}`),

  markNotificationRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: (mobile: string) =>
    request<{ success: boolean; updated: number }>('/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify({ mobile }),
    }),

  getSchemes: () => request<Scheme[]>('/schemes'),

  submitRegistration: (mobile: string) =>
    request<Farmer>('/farmers/submit-registration', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    }),

  getInsuranceSubsidies: (params?: { type?: 'Insurance' | 'Subsidy'; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.limit) qs.set('limit', String(params.limit));
    qs.set('limit', String(params?.limit ?? 50));
    return request<{ items: InsuranceSubsidy[]; total: number }>(`/insurance-subsidies?${qs.toString()}`);
  },

  registerPushToken: (mobile: string, pushToken: string) =>
    request<{ success: boolean }>('/auth/register-push-token', {
      method: 'POST',
      body: JSON.stringify({ mobile, pushToken }),
    }),

  getDocumentImages: (farmerId: string) =>
    request<{ documents: { docType: string; base64: string; mimeType: string; uploadedAt: string }[] }>(
      `/farmers/${farmerId}/documents`,
    ),

  submitGrievance: (data: {
    mobile: string;
    farmerId?: string | null;
    farmerName?: string | null;
    category: string;
    customCategory?: string;
    subject: string;
    description: string;
    attachments?: Array<{ name: string; base64: string; mimeType: string }>;
  }) =>
    request<GrievanceRecord>('/grievances', {
      method: 'POST',
      body: JSON.stringify({ ...data, source: 'farmer' }),
    }),

  getGrievances: (mobile: string) =>
    request<GrievanceRecord[]>(`/grievances?mobile=${encodeURIComponent(mobile)}`),

  getGrievanceById: (grievanceId: string) =>
    request<GrievanceRecord>(`/grievances/${encodeURIComponent(grievanceId)}`),

  updateGrievance: (grievanceId: string, data: {
    category?: string;
    subject?: string;
    description?: string;
  }) =>
    request<GrievanceRecord>(`/grievances/${encodeURIComponent(grievanceId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteGrievance: async (grievanceId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/grievances/${encodeURIComponent(grievanceId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error((err as Record<string, string>).error ?? 'Delete failed');
    }
  },

  getMyApplications: (mobile: string) =>
    request<Application[]>(`/applications?mobile=${encodeURIComponent(mobile)}`),

  reapplyApplication: (applicationId: string) =>
    request<Application>(`/applications/${encodeURIComponent(applicationId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Pending', adminReply: null, adminNotes: null }),
    }),

  applyForScheme: (data: {
    type: 'scheme' | 'subsidy' | 'insurance';
    farmerId: string;
    farmerName?: string | null;
    mobile: string;
    district?: string | null;
    village?: string | null;
    schemeId?: string;
    schemeName: string;
    schemeType?: string | null;
    crop?: string | null;
    land?: number | null;
    lossDescription?: string | null;
    documentRefs?: string[];
  }) =>
    request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify({ ...data, source: 'farmer' }),
    }),
};
