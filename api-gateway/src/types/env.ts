export type Bindings = {
  JWT_SECRET: string;
  AUTH_SERVICE_URL: string;
  N8N_WEBHOOK_URL: string;
  FRONTEND_URL: string;
};

export type Variables = {
  userId?: string;
  userEmail?: string;
  requestId?: string;
};

// Auth Service Response Types
export interface AuthRegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthRegisterResponse {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

// Contacts Service Response Types
export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsListResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactCreateRequest {
  name: string;
  email?: string;
  phone?: string;
}

export interface ContactCreateResponse {
  data: Contact;
}

export interface ContactDeleteResponse {
  success: boolean;
  id: string;
}

// Generic API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
