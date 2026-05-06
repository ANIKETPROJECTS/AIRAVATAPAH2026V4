export type FarmerStatus = 'Draft' | 'Pending' | 'Active' | 'Verified' | 'Inactive' | 'Rejected' | 'Cancelled';

export interface FarmerDoc {
  name: string;
  section: string;
  status: string;
  extractedAt?: string;
}

export interface Farmer {
  farmerId: string;
  mobile: string;
  name: string;
  status: FarmerStatus;
  aadhaar?: string;
  village?: string;
  district?: string;
  taluka?: string;
  surveyNumber?: string;
  bankAccount?: string;
  bankName?: string;
  ifsc?: string;
  branchName?: string;
  crop?: string;
  land?: string | number;
  gender?: string;
  dob?: string;
  fatherName?: string;
  address?: string;
  docs?: FarmerDoc[];
  addedAt: string;
  source?: string;
  rejectionReason?: string;
}

export interface Notification {
  notificationId: string;
  mobile?: string;
  farmerId?: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface SchemeEligibilityObject {
  summary?: string;
  familyCriteria?: string[];
  exclusions?: string[];
  parameters?: { parameter: string; rule: string }[];
}

export interface Scheme {
  id: string;
  name: string;
  type: 'CENTRAL' | 'STATE';
  status: 'Active' | 'Closed';
  description?: string;
  deadline?: string;
  benefit?: string;
  benefits?: string;
  ministry?: string;
  eligibility?: string | SchemeEligibilityObject;
  category?: string;
}

export type DocumentTypeId = 'aadhar' | 'bank_passbook' | 'form7' | 'form12' | 'form8a';

export interface DocumentDef {
  id: DocumentTypeId;
  label: string;
  labelHi: string;
  labelMr: string;
  description: string;
  icon: string;
}

export const REQUIRED_DOCUMENTS: DocumentDef[] = [
  {
    id: 'aadhar',
    label: 'Aadhaar Card',
    labelHi: 'आधार कार्ड',
    labelMr: 'आधार कार्ड',
    description: 'Front & back of your Aadhaar card (UIDAI)',
    icon: '🪪',
  },
  {
    id: 'bank_passbook',
    label: 'Bank Passbook',
    labelHi: 'बैंक पासबुक',
    labelMr: 'बँक पासबुक',
    description: 'First page of your bank passbook',
    icon: '🏦',
  },
  {
    id: 'form7',
    label: 'Form 7 (7/12)',
    labelHi: 'फॉर्म 7 (7/12)',
    labelMr: 'गाव नमुना सात',
    description: 'Maharashtra land ownership register (Satbara)',
    icon: '📄',
  },
  {
    id: 'form12',
    label: 'Form 12 (Pik Pahani)',
    labelHi: 'फॉर्म 12 (पीक पाहणी)',
    labelMr: 'गाव नमुना बारा',
    description: 'Crop inspection register',
    icon: '🌾',
  },
  {
    id: 'form8a',
    label: 'Form 8A',
    labelHi: 'फॉर्म 8-अ',
    labelMr: 'गाव नमुना आठ-अ',
    description: 'Holding register (Dharanachi Nondwahi)',
    icon: '📋',
  },
];

export interface Application {
  applicationId: string;
  type: 'scheme' | 'subsidy' | 'insurance';
  farmerId: string;
  farmerName: string | null;
  mobile: string;
  district: string | null;
  village: string | null;
  schemeId: string;
  schemeName: string;
  schemeType: string | null;
  crop: string | null;
  land: number | null;
  lossDescription: string | null;
  status: string;
  adminReply: string | null;
  adminNotes: string | null;
  source: string;
  appliedAt: string;
  updatedAt: string;
}

export type DocUploadStatus =
  | 'idle'
  | 'picking'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'error';

export interface DocUploadState {
  status: DocUploadStatus;
  fileName?: string;
  requestId?: string;
  error?: string;
}

export type Lang = 'en' | 'hi' | 'mr';

export interface InsuranceSubsidy {
  id: string;
  name: string;
  type: 'Insurance' | 'Subsidy';
  region: 'Central' | 'Maharashtra';
  status: 'Active' | 'Closed';
  description?: string;
  benefit?: string;
  eligibility?: string;
  deadline?: string;
  crops?: string[];
  minLand?: number;
  maxLand?: number;
}
