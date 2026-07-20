const fs = require('fs');
const path = require('path');

function createRoute(endpoint, method, serviceFunction, auth = false, extraArgs = '') {
  const code = `import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import * as service from '@/services/backend/auth';
import { AppError } from '@/lib/backend-utils/AppError';
${auth ? "import { authMiddleware } from '@/lib/middleware/auth';" : ""}

export async function ${method}(req: NextRequest, props: any) {
  try {
    await connectDb();
    ${auth ? "const user = await authMiddleware(req);" : ""}
    
    let body = {};
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      try { body = await req.json(); } catch(e) {}
    }
    
    const cookies = Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]));
    const params = await props?.params;

    const reqArgs = {
      body,
      query: Object.fromEntries(req.nextUrl.searchParams),
      user: ${auth ? "user" : "null"},
      cookies,
      params,
      ${extraArgs}
    };

    const result = await service.${serviceFunction}(reqArgs);
    const response = NextResponse.json(result.data, { status: result.status });

    if (result.cookies) {
      for (const cookie of result.cookies) {
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
}`;
  const destPath = path.join('c:/Users/bhave/MyTube/frontend/src/app/api', endpoint, 'route.ts');
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, code);
  console.log('Created', destPath);
}

createRoute('auth/register', 'POST', 'register');
createRoute('auth/login', 'POST', 'login');
createRoute('auth/refresh', 'POST', 'refresh');
createRoute('auth/logout', 'POST', 'logout');
createRoute('auth/me', 'GET', 'me', true);
createRoute('auth/updateprofile/[id]', 'PATCH', 'updateprofile', true);
createRoute('auth/getuser/[id]', 'GET', 'getuser', false);
createRoute('auth/mydownloads', 'GET', 'getMyDownloads', true);
createRoute('auth/search', 'GET', 'searchUsers', true);
