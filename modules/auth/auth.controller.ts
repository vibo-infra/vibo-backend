// The controller only handles HTTP — 
// extracting data from the request, calling the service, and sending the response. 
// No business logic, no SQL.

import { Request, Response } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.register({ email, password });
    return res.status(201).json(result);

  } catch (err: any) {
    if (err.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({ error: 'Email is already in use' });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login({
      email,
      password,
      deviceInfo: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Login error:', err);
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (err.message === 'ACCOUNT_BANNED') {
      return res.status(403).json({ error: 'This account has been suspended' });
    }
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    await authService.logout(token);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await authService.refresh(refreshToken);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.message === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
};