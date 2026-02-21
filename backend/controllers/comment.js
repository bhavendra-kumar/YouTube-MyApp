import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  const postcomment = new comment(commentdata);
  try {
    const saved = await postcomment.save();

    const io = req.app.get("io");
    io?.to(`video:${saved.videoid}`).emit("comment:new", saved);

    return res.status(200).json({ comment: true, data: saved });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const deleted = await comment.findByIdAndDelete(_id);

    if (deleted) {
      const io = req.app.get("io");
      io?.to(`video:${deleted.videoid}`).emit("comment:deleted", {
        _id: String(deleted._id),
        videoid: String(deleted.videoid),
      });
    }
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      {
        $set: { commentbody: commentbody },
      },
      { new: true }
    );

    if (updatecomment) {
      const io = req.app.get("io");
      io?.to(`video:${updatecomment.videoid}`).emit("comment:updated", updatecomment);
    }

    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};