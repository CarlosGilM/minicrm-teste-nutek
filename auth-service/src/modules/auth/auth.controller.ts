import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schemas';

export class AuthController {
  async register(
    req: Request<object, object, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await authService.register(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<object, object, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(
    req: Request<object, object, RefreshInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async logout(
    req: Request<object, object, LogoutInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await authService.logout(req.body.refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
