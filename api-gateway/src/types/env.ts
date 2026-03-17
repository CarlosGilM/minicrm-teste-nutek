export type Bindings = {
  JWT_SECRET: string;       
  AUTH_SERVICE_URL: string; 
  N8N_WEBHOOK_URL: string;  
  FRONTEND_URL: string;     
};

export type Variables = {
  userId: string;
  userEmail: string;
};
