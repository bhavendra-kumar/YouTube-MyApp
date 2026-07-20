import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { optionalAuth } from '@/lib/middleware/auth';

// In-memory notification store (replace with Notification model later)
const notificationStore: Record<string, any[]> = {};

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const user = await optionalAuth(req);
    if (!user?.id) {
      return NextResponse.json({ data: [], count: 0 }, { status: 200 });
    }

    const notifications = notificationStore[user.id] ?? [];
    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
    const filtered = unreadOnly ? notifications.filter(n => !n.read) : notifications;

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error', data: [], count: 0 }, { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDb();
    const user = await optionalAuth(req);
    if (!user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const url = req.nextUrl;
    if (url.pathname.endsWith('/read-all')) {
      if (notificationStore[user.id]) {
        notificationStore[user.id] = notificationStore[user.id].map(n => ({ ...n, read: true }));
      }
      return NextResponse.json({ success: true, message: 'All marked as read' }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error' }, { status: 200 });
  }
}
