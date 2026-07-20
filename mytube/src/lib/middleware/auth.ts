import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import User from '@/models/user';
import { AppError } from '../backend-utils/AppError';

export async function authMiddleware(req: NextRequest) {
  try {
    let token = '';

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      const cookie = req.cookies.get('token')?.value;
      if (cookie) {
        token = cookie;
      }
    }

    if (!token) {
      throw new AppError('Unauthorized', 401);
    }

    const decoded = jwt.verify(token, env.accessTokenSecret as string) as any;
    
    if (!decoded || !decoded.id) {
      throw new AppError('Unauthorized', 401);
    }

    return { id: decoded.id, role: decoded.role };
  } catch (error) {
    throw new AppError('Unauthorized', 401);
  }
}

export async function optionalAuth(req: NextRequest) {
  try {
    let token = '';

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      const cookie = req.cookies.get('token')?.value;
      if (cookie) {
        token = cookie;
      }
    }

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, env.accessTokenSecret as string) as any;
    
    if (!decoded || !decoded.id) {
      return null;
    }

    return { id: decoded.id, role: decoded.role };
  } catch (error) {
    return null;
  }
}
