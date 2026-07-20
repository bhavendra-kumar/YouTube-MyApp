import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import * as service from '@/services/backend/auth';
import { AppError } from '@/lib/backend-utils/AppError';
import { authMiddleware } from '@/lib/middleware/auth';

export async function GET(req: NextRequest, props: any) {
  try {
    await connectDb();
    const user = await authMiddleware(req);
    
    let body = {};
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      try { body = await req.json(); } catch(e) {}
    }
    
    const cookies = Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]));
    const params = await props?.params;

    const reqArgs = {
      body,
      query: Object.fromEntries(req.nextUrl.searchParams),
      user: user,
      cookies,
      params,
      
    };

    const result = await service.searchUsers(reqArgs);
    const response = NextResponse.json(result.data, { status: result.status });

    if (result.cookies) {
      for (const cookie of result.cookies as any[]) {
        if (cookie.clear) {
          response.cookies.delete(cookie.n);
        } else {
          response.cookies.set(cookie.n, cookie.v, cookie.o);
        }
      }
    }

    return response;
  } catch (error: any) {
    const status = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ success: false, message }, { status });
  }
}