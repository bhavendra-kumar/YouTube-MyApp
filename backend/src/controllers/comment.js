import mongoose from "mongoose";
import { createRequire } from "module";
import Comment from "../models/comment.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { validateCommentText } from "../utils/moderation.js";
import { translateText } from "../services/translate.js";

const require = createRequire(import.meta.url);
let geoip;
try {
  // geoip-lite is CJS; require() works reliably in ESM projects
  geoip = require("geoip-lite");
} catch {
  geoip = null;
}

const COMMENT_LIST_SELECT =
  "videoid userid commentbody usercommented commentedon createdAt city originalLanguage likes dislikes isDeleted";

function getClientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  const raw =
    (typeof xff === "string" && xff.split(",")[0]?.trim()) || req.ip || req.socket?.remoteAddress;

  if (!raw) return null;

  let ip = raw;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];
  return ip;
}

function detectCityFromRequest(req) {
  try {
    const ip = getClientIp(req);
    if (!ip) return "Unknown";
    if (!geoip?.lookup) return "Unknown";
    const geo = geoip.lookup(ip);
    const city = geo?.city;
    return typeof city === "string" && city.trim() ? city.trim() : "Unknown";
  } catch {
    return "Unknown";
  }
}

function detectOriginalLanguage(req) {
  const fromBody = req.body?.originalLanguage;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();

  const header = req.headers?.["accept-language"];
  if (typeof header === "string" && header.trim()) {
    // e.g. "en-US,en;q=0.9" -> "en"
    const first = header.split(",")[0]?.trim();
    const lang = first?.split(";")[0]?.trim()?.split("-")[0]?.trim();
    if (lang) return lang;
  }

  return "unknown";
}

export const postcomment = async (req, res) => {
  try {
    const commentdata = { ...req.body };

    commentdata.commentbody = validateCommentText(commentdata.commentbody);
    commentdata.city = detectCityFromRequest(req);
    commentdata.originalLanguage = detectOriginalLanguage(req);
    commentdata.isDeleted = false;
    commentdata.likes = [];
    commentdata.dislikes = [];

    if (req.user?.id) {
      commentdata.userid = req.user.id;
    }

    const created = await new Comment(commentdata).save();

    const io = req.app.get("io");
    io?.to(`video:${created.videoid}`).emit("comment:new", created);

    return sendSuccess(res, { comment: true, data: created }, 200);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to create comment", 500);
  }
};

export const getallcomment = async (req, res) => {
  try {
    const { videoid } = req.params;

    const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
    const rawLimit = Number.parseInt(String(req.query.limit ?? "20"), 10);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
    const limit = Math.min(limitUncapped, 100);

    const query = { videoid, isDeleted: false };
    const total = await Comment.countDocuments(query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const currentPage = totalPages > 0 ? Math.min(page, totalPages) : page;
    const skip = (currentPage - 1) * limit;

    const commentvideo = await Comment.find(query)
      .select(COMMENT_LIST_SELECT)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const items = commentvideo.map((c) => {
      const likes = Array.isArray(c.likes) ? c.likes : [];
      const dislikes = Array.isArray(c.dislikes) ? c.dislikes : [];
      // Don't return the full lists to clients; only counts.
      // eslint-disable-next-line no-unused-vars
      const { likes: _l, dislikes: _d, ...rest } = c;
      return {
        ...rest,
        likesCount: likes.length,
        dislikesCount: dislikes.length,
      };
    });

    return sendSuccess(
      res,
      {
        items,
        total,
        totalPages,
        currentPage,
      },
      200
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to fetch comments", 500);
  }
};

export const deletecomment = async (req, res) => {
  try {
    const { id: _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new AppError("comment unavailable", 404);
    }

    const existing = await Comment.findById(_id).select("userid videoid isDeleted").lean();
    if (!existing) {
      throw new AppError("comment unavailable", 404);
    }
    if (req.user?.id && String(existing.userid) !== String(req.user.id)) {
      throw new AppError("Forbidden", 403);
    }

    if (!existing.isDeleted) {
      await Comment.findByIdAndUpdate(_id, { $set: { isDeleted: true } }, { new: false }).lean();
      const io = req.app.get("io");
      io?.to(`video:${existing.videoid}`).emit("comment:deleted", {
        _id: String(_id),
        videoid: String(existing.videoid),
      });
    }

    return sendSuccess(res, { comment: true }, 200);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to delete comment", 500);
  }
};

export const editcomment = async (req, res) => {
  try {
    const { id: _id } = req.params;
    const { commentbody } = req.body;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new AppError("comment unavailable", 404);
    }

    const normalized = validateCommentText(commentbody);

    // Only the author can edit (best-effort; relies on stored userid)
    const existing = await Comment.findById(_id).select("userid videoid isDeleted").lean();
    if (!existing || existing.isDeleted) {
      throw new AppError("comment unavailable", 404);
    }
    if (req.user?.id && String(existing.userid) !== String(req.user.id)) {
      throw new AppError("Forbidden", 403);
    }

    const updatecomment = await Comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: normalized } },
      { new: true }
    )
      .select(COMMENT_LIST_SELECT)
      .lean();

    if (updatecomment) {
      const io = req.app.get("io");
      io?.to(`video:${updatecomment.videoid}`).emit("comment:updated", updatecomment);
    }

    return sendSuccess(res, updatecomment, 200);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to edit comment", 500);
  }
};

export const likeComment = async (req, res) => {
  try {
    const { id: _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new AppError("comment unavailable", 404);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const updated = await Comment.findOneAndUpdate(
      { _id, isDeleted: false },
      {
        $pull: { dislikes: userId },
        $addToSet: { likes: userId },
      },
      { new: true }
    )
      .select("likes dislikes isDeleted videoid")
      .lean();

    if (!updated) {
      throw new AppError("comment unavailable", 404);
    }

    return sendSuccess(
      res,
      {
        _id: String(updated._id),
        videoid: String(updated.videoid),
        likesCount: updated.likes?.length ?? 0,
        dislikesCount: updated.dislikes?.length ?? 0,
        isDeleted: Boolean(updated.isDeleted),
      },
      200
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to like comment", 500);
  }
};

export const dislikeComment = async (req, res) => {
  try {
    const { id: _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new AppError("comment unavailable", 404);
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    let updated = await Comment.findOneAndUpdate(
      { _id, isDeleted: false },
      {
        $pull: { likes: userId },
        $addToSet: { dislikes: userId },
      },
      { new: true }
    )
      .select("likes dislikes isDeleted videoid")
      .lean();

    if (!updated) {
      throw new AppError("comment unavailable", 404);
    }

    if ((updated.dislikes?.length ?? 0) >= 2 && !updated.isDeleted) {
      await Comment.findByIdAndUpdate(_id, { $set: { isDeleted: true } }).lean();
      updated = { ...updated, isDeleted: true };

      const io = req.app.get("io");
      io?.to(`video:${updated.videoid}`).emit("comment:deleted", {
        _id: String(updated._id),
        videoid: String(updated.videoid),
      });
    }

    return sendSuccess(
      res,
      {
        _id: String(updated._id),
        videoid: String(updated.videoid),
        likesCount: updated.likes?.length ?? 0,
        dislikesCount: updated.dislikes?.length ?? 0,
        isDeleted: Boolean(updated.isDeleted),
      },
      200
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to dislike comment", 500);
  }
};

export const translateComment = async (req, res) => {
  try {
    const { text, targetLang } = req.body ?? {};
    const translated = await translateText({ text, targetLang });
    return res.status(200).json({
      success: true,
      translated,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Failed to translate comment", 500);
  }
};
