// src/types/api.ts

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type AuthRegisterResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type ContactResponse = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};
