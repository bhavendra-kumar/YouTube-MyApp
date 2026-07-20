// @ts-nocheck
import Download from "@/models/download";
import { AppError } from "@/lib/backend-utils/AppError";
import { sendSuccess } from "@/lib/backend-utils/apiResponse";

export const getUserDownloads = async (reqArgs: any = {}) => {
  const req = reqArgs;
  const resContext = { cookies: [] };
  const res = {
    cookie: (n,v,o) => resContext.cookies.push({n,v,o,clear:false}),
    clearCookie: (n,o) => resContext.cookies.push({n,v:"",o,clear:true}),
    status: (c) => ({ json: (d) => ({ status: c, data: d, cookies: resContext.cookies }) })
  };
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const rows = await Download.find({ userId })
    .sort({ downloadedAt: -1 })
    .populate({
      path: "videoId",
      select: "videotitle thumbnailUrl",
    })
    .lean();

  const items = (Array.isArray(rows) ? rows : [])
    .filter((x) => x && x.videoId)
    .map((row) => {
      // When populated, row.videoId is the video doc.
      const vid = row.videoId;
      return {
        videoId: vid?._id,
        videotitle: vid?.videotitle || "Untitled",
        thumbnail: vid?.thumbnailUrl || "",
        filePath: row.filePath,
        downloadedAt: row.downloadedAt,
      };
    });

  return { data: items, status: 200, cookies: resContext.cookies };
};
