const fs = require('fs');
const path = require('path');

function createRoute(endpoint, method, serviceName, serviceFunction, auth = false, extraArgs = '') {
  const code = `import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import * as service from '@/services/backend/${serviceName}';
import { AppError } from '@/lib/backend-utils/AppError';
${auth ? "import { authMiddleware, optionalAuth } from '@/lib/middleware/auth';" : ""}

export async function ${method}(req: NextRequest, props: any) {
  try {
    await connectDb();
    ${auth === true ? "const user = await authMiddleware(req);" : auth === 'optional' ? "const user = await optionalAuth(req);" : ""}
    
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

// ---------------- VIDEO ----------------
// upload is special (formData), skipping it in this script.
createRoute('video/getall', 'GET', 'video', 'getallvideo');
createRoute('video/home', 'GET', 'video', 'getHomeFeed');
createRoute('video/homefeed', 'GET', 'video', 'getHomeFeed');
createRoute('video/shorts', 'GET', 'video', 'getShortsFeed');
createRoute('video/recommended', 'GET', 'video', 'getHomeFeed', true);
createRoute('video/watchtime', 'POST', 'video', 'postWatchTime');
// download is special (requires canDownload logic), skipping it in this script.
createRoute('video/[id]', 'PATCH', 'video', 'updateMyVideo', true);
createRoute('video/[id]', 'DELETE', 'video', 'deleteMyVideo', true);
createRoute('video/[id]', 'GET', 'video', 'getvideobyid');

// ---------------- HISTORY ----------------
createRoute('history/getall', 'GET', 'history', 'getAllHistoryController', true);
createRoute('history/deleteall', 'DELETE', 'history', 'clearHistoryController', true);

// ---------------- LIKE / DISLIKE ----------------
createRoute('like', 'POST', 'like', 'likeVideoController', true);
createRoute('like/getall', 'GET', 'like', 'getAlllikeVideoController', true);
createRoute('like/deleteall', 'DELETE', 'like', 'deleteLikedVideoController', true);
// dislike (it's in like.js routes actually but uses dislikeController maybe? I'll assume standard naming based on controllers)

// ---------------- WATCHLATER ----------------
createRoute('watch', 'POST', 'watchlater', 'watchLaterController', true);
createRoute('watch/getall', 'GET', 'watchlater', 'getAllwatchLaterController', true);
createRoute('watch/deleteall', 'DELETE', 'watchlater', 'deleteWatchLaterController', true);

// ---------------- COMMENT ----------------
createRoute('comment', 'POST', 'comment', 'postComment', true);
createRoute('comment', 'GET', 'comment', 'getComment', 'optional');
createRoute('comment/[id]', 'DELETE', 'comment', 'deleteComment', true);
createRoute('comment/[id]', 'PATCH', 'comment', 'editComment', true);
createRoute('comment/like', 'POST', 'comment', 'likeComment', true);
createRoute('comment/dislike', 'POST', 'comment', 'dislikeComment', true);
createRoute('comment/reply', 'POST', 'comment', 'replyToComment', true);

// ---------------- SUBSCRIPTION ----------------
createRoute('subscribe', 'POST', 'subscription', 'subscribeChannel', true);
createRoute('subscribe/check', 'POST', 'subscription', 'checkSubscription', 'optional');
createRoute('subscribe/my', 'GET', 'subscription', 'getMySubscriptions', true);
createRoute('subscribe/subscribers', 'GET', 'subscription', 'getSubscribers', true);
createRoute('subscribe/trending', 'GET', 'subscription', 'getTrendingChannels');

// ---------------- PLAYLIST ----------------
createRoute('playlist/create', 'POST', 'playlist', 'createPlaylist', true);
createRoute('playlist/my', 'GET', 'playlist', 'getMyPlaylists', true);
createRoute('playlist/channel/[channelId]', 'GET', 'playlist', 'getChannelPlaylists', 'optional');
createRoute('playlist/[id]', 'GET', 'playlist', 'getPlaylistById', 'optional');
createRoute('playlist/[id]', 'DELETE', 'playlist', 'deletePlaylist', true);
createRoute('playlist/[id]/add', 'POST', 'playlist', 'addVideoToPlaylist', true);
createRoute('playlist/[id]/remove', 'DELETE', 'playlist', 'removeVideoFromPlaylist', true);

// ---------------- COMMUNITY ----------------
createRoute('community/post', 'POST', 'community', 'createPost', true); // special (upload)? skip upload parts for now.
createRoute('community/post/[id]', 'DELETE', 'community', 'deletePost', true);
createRoute('community/channel/[channelId]', 'GET', 'community', 'getChannelPosts', 'optional');
createRoute('community/post/[id]/like', 'POST', 'community', 'likePost', true);
createRoute('community/post/[id]/comment', 'POST', 'community', 'commentPost', true);

// ---------------- PAYMENT ----------------
createRoute('payment/create-order', 'POST', 'payment', 'createOrder', true);
createRoute('payment/verify', 'POST', 'payment', 'verifyPayment', true);

