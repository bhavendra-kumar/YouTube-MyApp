// @ts-nocheck
import WatchLater from "@/models/watchlater";
import { AppError } from "@/lib/backend-utils/AppError";
import { sendSuccess } from "@/lib/backend-utils/apiResponse";
import { withMediaUrls } from "@/lib/backend-utils/mediaUrl";

const VIDEO_LIST_SELECT =
  "videotitle filepath thumbnailUrl videochanel views createdAt duration category contentType isShort uploader Like Dislike commentsCount trendingScore";

export const handlewatchlater = async (reqArgs: any = {}) => {
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

  const exisitingwatchlater = await WatchLater.findOne({
    viewer: userId,
    videoid: videoId,
  }).lean();

  if (exisitingwatchlater) {
    await WatchLater.findByIdAndDelete(exisitingwatchlater._id);
    return { data: { watchlater: false }, status: 200, cookies: resContext.cookies };
  }

  await WatchLater.create({ viewer: userId, videoid: videoId });
  return { data: { watchlater: true }, status: 200, cookies: resContext.cookies };
};

export const getallwatchlater = async (reqArgs: any = {}) => {
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

  const watchlatervideo = await WatchLater.find({ viewer: userId })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "videoid",
      model: "videofiles",
      select: VIDEO_LIST_SELECT,
    })
    .lean();

  const items = Array.isArray(watchlatervideo)
    ? watchlatervideo.map((row) => ({
        ...row,
        videoid: row?.videoid ? withMediaUrls(row.videoid, req) : row?.videoid,
      }))
    : [];

  return { data: items, status: 200, cookies: resContext.cookies };
};

export const getWatchLaterStatus = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const { userId: userIdParam, videoId } = req.params;
  const userId = req.user?.id || userIdParam;
  if (!userId || !videoId) {
    throw new AppError("userId and videoId are required", 400);
  }

  if (req.user?.id && userIdParam && String(req.user.id) !== String(userIdParam)) {
    throw new AppError("userId does not match token", 403);
  }

  const existing = await WatchLater.findOne({ viewer: userId, videoid: videoId })
    .select("_id")
    .lean();
  return { data: { watchlater: Boolean(existing) }, status: 200, cookies: resContext.cookies };
};
