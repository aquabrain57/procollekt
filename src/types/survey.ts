export type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'decimal' | 'select' | 'multiselect' | 'date' | 'time' | 'datetime' | 'location' | 'photo' | 'audio' | 'video' | 'rating' | 'note' | 'barcode' | 'consent' | 'file' | 'range' | 'ranking' | 'calculate' | 'hidden' | 'matrix' | 'line' | 'area' | 'signature';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  conditionalOn?: {
    fieldId: string;
    value: string | string[];
  };
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  createdAt: string;
  status: 'active' | 'draft' | 'completed';
  responseCount: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  data: Record<string, any>;
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}
