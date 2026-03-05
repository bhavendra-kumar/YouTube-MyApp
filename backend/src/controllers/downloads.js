import Download from "../models/download.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getUserDownloads = async (req, res) => {
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

  return sendSuccess(res, items, 200);
};
