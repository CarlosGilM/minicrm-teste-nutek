import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: '*',
  credentials: true,
}));

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Routes
app.use('/auth', authRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
