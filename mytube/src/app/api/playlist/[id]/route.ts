import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import * as service from '@/services/backend/playlist';
import { authMiddleware, optionalAuth } from '@/lib/middleware/auth';

export async function GET(req: NextRequest, props: any) {
  try {
    await connectDb();
    const user = await optionalAuth(req);
    const params = await props?.params;
    const reqArgs = { user, params, query: Object.fromEntries(req.nextUrl.searchParams) };
    const result = await service.getPlaylistById(reqArgs);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

export async function DELETE(req: NextRequest, props: any) {
  try {
    await connectDb();
    const user = await authMiddleware(req);
    const params = await props?.params;
    const reqArgs = { user, params };
    const result = await service.deletePlaylist(reqArgs);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
  }
}