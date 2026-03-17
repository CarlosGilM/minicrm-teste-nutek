import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schemas';

const router = Router();

router.post('/register', validate(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', validate(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

router.post('/refresh', validate(refreshSchema), (req, res, next) => {
  authController.refresh(req, res, next);
});

router.post('/logout', validate(logoutSchema), (req, res, next) => {
  authController.logout(req, res, next);
});

export default router;
