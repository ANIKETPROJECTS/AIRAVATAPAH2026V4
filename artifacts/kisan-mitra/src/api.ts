import { Farmer, Notification, Scheme, InsuranceSubsidy, Application } from './types';

function getApiBase(): string {
  if (typeof window === 'undefined') {
    return process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:8000/api';
  }
  const override = process.env['EXPO_PUBLIC_API_BASE_URL'];
  if (override) return override;

  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }
  return `${protocol}//${hostname}:8000/api`;
}

export const API_BASE = getApiBase();

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

    if (typeof window !== 'undefined') {
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
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error((err as Record<string, string>).error ?? 'Upload failed');
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
  }) =>
    request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify({ ...data, source: 'farmer' }),
    }),
};
