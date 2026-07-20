import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import * as service from '@/services/backend/comment';
import { authMiddleware, optionalAuth } from '@/lib/middleware/auth';

export async function GET(req: NextRequest, props: any) {
  try {
    await connectDb();
    const user = await optionalAuth(req);
    const params = await props?.params;
    const reqArgs = { user, params, query: Object.fromEntries(req.nextUrl.searchParams) };
    const result = await service.getallcomment(reqArgs);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    await connectDb();
    const user = await authMiddleware(req);
    const params = await props?.params;
    let body = {};
    try { body = await req.json(); } catch(e) {}
    const reqArgs = { user, params, body };
    const result = await service.postcomment(reqArgs);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
  }
}