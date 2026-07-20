// @ts-nocheck
import Video from "@/models/video";
import History from "@/models/history";
import { AppError } from "@/lib/backend-utils/AppError";
import { sendSuccess } from "@/lib/backend-utils/apiResponse";
import { withMediaUrls } from "@/lib/backend-utils/mediaUrl";

const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

export const handlehistory = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const userId = req.user?.id || req.body.userId;
  const { videoId } = req.params;

  if (!userId) {
    throw new AppError("userId is required", 400);
  }

  if (req.user?.id && req.body?.userId && String(req.user.id) !== String(req.body.userId)) {
    throw new AppError("userId does not match token", 403);
  }

  // Prevent duplicates: keep a single history row per (viewer, videoid).
  // If it already exists, bump updatedAt so it sorts as most recent.
  const existing = await History.findOne({ viewer: userId, videoid: videoId }).select("_id").lean();

  if (existing?._id) {
    await History.findByIdAndUpdate(existing._id, { $set: { updatedAt: new Date() } });
    return { data: { history: true, updated: true }, status: 200, cookies: resContext.cookies };
  }

  await History.create({ viewer: userId, videoid: videoId });
  return { data: { history: true, created: true }, status: 200, cookies: resContext.cookies };
};

export const handleview = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { videoId } = req.params;
  await Video.findById(videoId).select("_id").lean();
  return { data: { viewed: true }, status: 200, cookies: resContext.cookies };
};

export const getallhistoryVideo = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { userId: userIdParam } = req.params;
  const userId = req.user?.id || userIdParam;

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const limit = Math.min(limitUncapped, 50);
  const skip = (page - 1) * limit;

  const historyvideo = await History.find({ viewer: userId })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "videoid",
      model: "videofiles",
      select: VIDEO_LIST_SELECT,
    })
    .lean();

  const items = Array.isArray(historyvideo)
    ? historyvideo.map((row) => ({
        ...row,
        videoid: row?.videoid ? withMediaUrls(row.videoid, req) : row?.videoid,
      }))
    : [];

  return { data: items, status: 200, cookies: resContext.cookies };
};

export const deleteHistoryItem = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const userId = req.user?.id;
  const { historyId } = req.params;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!historyId) {
    throw new AppError("historyId is required", 400);
  }

  const item = await History.findById(historyId).select("_id viewer").lean();
  if (!item) {
    throw new AppError("History item not found", 404);
  }

  if (String(item.viewer) !== String(userId)) {
    throw new AppError("Forbidden", 403);
  }

  await History.findByIdAndDelete(historyId);
  return { data: { removed: true }, status: 200, cookies: resContext.cookies };
};

export const clearHistory = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const result = await History.deleteMany({ viewer: userId });
  const deletedCount = Number(result?.deletedCount ?? 0);

  return { data: { cleared: true, deletedCount }, status: 200, cookies: resContext.cookies };
};
