export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'location' | 'photo' | 'rating';

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
