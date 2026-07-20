import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import * as service from "@/services/backend/videoDownload";
import { authMiddleware } from "@/lib/middleware/auth";
import { checkCanDownloadVideo } from "@/lib/middleware/canDownload";

export async function POST(req: NextRequest, props: any) {
  try {
    await connectDb();
    const user = await authMiddleware(req);
    const params = await props?.params;
    
    // Authorization check
    const videoDoc = await checkCanDownloadVideo(user.id, params.id);
    
    let body = {};
    try { body = await req.json(); } catch(e) {}
    
    const reqArgs = {
      user,
      params,
      body,
      videoDoc,
      query: Object.fromEntries(req.nextUrl.searchParams),
      cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]))
    };

    const result = await service.downloadVideo(reqArgs);
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
    const message = error.message || "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status });
  }
}
