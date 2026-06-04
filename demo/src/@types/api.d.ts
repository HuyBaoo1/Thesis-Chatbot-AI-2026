export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'COUNSELOR' | 'USER';
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
}

export interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  score?: number;
  status?: string;
  source?: string;
  last_interaction_at?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  lead_id: string;
  messages?: Message[];
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  created_at?: string;
  sources?: Source[];
  follow_up_suggestions?: string[];
}

export interface Source {
  id?: string;
  content?: string;
  source?: string;
  category?: string;
  score?: number;
}

export interface Analytics {
  new_leads?: number;
  total_conversations?: number;
  fallback_rate?: number;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read?: boolean;
  created_at?: string;
}

export interface ApiError {
  detail?: string;
  message?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}