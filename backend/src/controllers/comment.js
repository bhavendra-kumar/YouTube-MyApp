import mongoose from "mongoose";
import Comment from "../models/comment.js";
import { AppError } from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

const COMMENT_LIST_SELECT =
  "videoid userid commentbody usercommented commentedon createdAt";

export const postcomment = async (req, res) => {
  const commentdata = { ...req.body };
  if (req.user?.id) {
    commentdata.userid = req.user.id;
  }

  const created = await new Comment(commentdata).save();

  const io = req.app.get("io");
  io?.to(`video:${created.videoid}`).emit("comment:new", created);

  return sendSuccess(res, { comment: true, data: created }, 200);
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  const rawPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "20"), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limitUncapped = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
  const limit = Math.min(limitUncapped, 100);

  const query = { videoid };
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

  return sendSuccess(
    res,
    {
      items: commentvideo,
      total,
      totalPages,
      currentPage,
    },
    200
  );
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    throw new AppError("comment unavailable", 404);
  }

  const existing = await Comment.findById(_id).select("userid videoid").lean();
  if (!existing) {
    throw new AppError("comment unavailable", 404);
  }
  if (req.user?.id && String(existing.userid) !== String(req.user.id)) {
    throw new AppError("Forbidden", 403);
  }

  const deleted = await Comment.findByIdAndDelete(_id).select("videoid").lean();

  if (deleted) {
    const io = req.app.get("io");
    io?.to(`video:${deleted.videoid}`).emit("comment:deleted", {
      _id: String(deleted._id),
      videoid: String(deleted.videoid),
    });
  }

  return sendSuccess(res, { comment: true }, 200);
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    throw new AppError("comment unavailable", 404);
  }

  // Only the author can edit (best-effort; relies on stored userid)
  const existing = await Comment.findById(_id).select("userid videoid").lean();
  if (!existing) {
    throw new AppError("comment unavailable", 404);
  }
  if (req.user?.id && String(existing.userid) !== String(req.user.id)) {
    throw new AppError("Forbidden", 403);
  }

  const updatecomment = await Comment.findByIdAndUpdate(
    _id,
    { $set: { commentbody } },
    { new: true }
  )
    .select(COMMENT_LIST_SELECT)
    .lean();

  if (updatecomment) {
    const io = req.app.get("io");
    io?.to(`video:${updatecomment.videoid}`).emit("comment:updated", updatecomment);
  }

  return sendSuccess(res, updatecomment, 200);
};
