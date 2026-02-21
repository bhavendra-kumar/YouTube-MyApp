import video from "../Modals/video.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  const reactionType = String(req.body?.type || "like").toLowerCase();

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    if (reactionType === "dislike") {
      const existingDislike = await dislike.findOne({
        viewer: userId,
        videoid: videoId,
      });

      // If the user currently likes the video and is disliking, remove the like.
      const existingLike = await like.findOne({
        viewer: userId,
        videoid: videoId,
      });
      if (!existingDislike && existingLike) {
        await like.findByIdAndDelete(existingLike._id);
        await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      }

      if (existingDislike) {
        await dislike.findByIdAndDelete(existingDislike._id);
        await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
      } else {
        await dislike.create({ viewer: userId, videoid: videoId });
        await video.findByIdAndUpdate(videoId, { $inc: { Dislike: 1 } });
      }

      const updatedVideo = await video.findById(videoId).select("Like Dislike");
      const io = req.app.get("io");
      io?.to(`video:${videoId}`).emit("like:updated", {
        videoId,
        likes: updatedVideo?.Like ?? 0,
      });
      io?.to(`video:${videoId}`).emit("dislike:updated", {
        videoId,
        dislikes: updatedVideo?.Dislike ?? 0,
      });

      return res.status(200).json({
        liked: false,
        disliked: !existingDislike,
        likes: updatedVideo?.Like ?? 0,
        dislikes: updatedVideo?.Dislike ?? 0,
      });
    }

    // Default: like toggle
    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    // If the user currently dislikes the video and is liking, remove the dislike.
    const existingDislike = await dislike.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (!exisitinglike && existingDislike) {
      await dislike.findByIdAndDelete(existingDislike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
    }

    if (exisitinglike) {
      await like.findByIdAndDelete(exisitinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
    }

    const updatedVideo = await video.findById(videoId).select("Like Dislike");
    const io = req.app.get("io");
    io?.to(`video:${videoId}`).emit("like:updated", {
      videoId,
      likes: updatedVideo?.Like ?? 0,
    });
    io?.to(`video:${videoId}`).emit("dislike:updated", {
      videoId,
      dislikes: updatedVideo?.Dislike ?? 0,
    });

    return res.status(200).json({
      liked: !exisitinglike,
      disliked: false,
      likes: updatedVideo?.Like ?? 0,
      dislikes: updatedVideo?.Dislike ?? 0,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getReactionStatus = async (req, res) => {
  const { userId, videoId } = req.params;

  if (!userId || !videoId) {
    return res.status(400).json({ message: "userId and videoId are required" });
  }

  try {
    const [likedDoc, dislikedDoc] = await Promise.all([
      like.findOne({ viewer: userId, videoid: videoId }).select("_id"),
      dislike.findOne({ viewer: userId, videoid: videoId }).select("_id"),
    ]);

    return res.status(200).json({
      liked: Boolean(likedDoc),
      disliked: Boolean(dislikedDoc),
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};