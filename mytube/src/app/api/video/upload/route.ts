import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import * as service from "@/services/backend/video";
import { authMiddleware } from "@/lib/middleware/auth";
import { AppError } from "@/lib/backend-utils/AppError";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const user = await authMiddleware(req);

    const formData = await req.formData();
    
    // Convert formData to a format our service can use.
    // In Express, multer populates req.files. Here we reconstruct it.
    const files: Record<string, File[]> = {};
    const body: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (!files[key]) files[key] = [];
        files[key].push(value);
      } else {
        body[key] = value;
      }
    }

    const reqArgs = {
      user,
      body,
      files,
      // Pass raw FormData in case it's needed
      formData,
      cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]))
    };

    const result = await service.uploadVideo(reqArgs);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    const status = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status });
  }
}
