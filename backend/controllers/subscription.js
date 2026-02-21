import mongoose from "mongoose";
import subscription from "../Modals/subscription.js";

export const toggleSubscribe = async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ message: "userId is required" });
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid userId" });
  }
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    return res.status(400).json({ message: "Invalid channelId" });
  }

  if (String(userId) === String(channelId)) {
    return res.status(400).json({ message: "You cannot subscribe to yourself" });
  }

  try {
    const existing = await subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });

    if (existing) {
      await subscription.findByIdAndDelete(existing._id);
    } else {
      await subscription.create({ subscriber: userId, channel: channelId });
    }

    const subscribers = await subscription.countDocuments({ channel: channelId });

    return res.status(200).json({
      subscribed: !existing,
      subscribers,
    });
  } catch (error) {
    // Handle race conditions on unique index
    if (error?.code === 11000) {
      const subscribers = await subscription.countDocuments({ channel: channelId });
      return res.status(200).json({ subscribed: true, subscribers });
    }

    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getSubscriberCount = async (req, res) => {
  const { channelId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    return res.status(400).json({ message: "Invalid channelId" });
  }

  try {
    const subscribers = await subscription.countDocuments({ channel: channelId });
    return res.status(200).json({ subscribers });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  const { channelId, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid userId" });
  }
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    return res.status(400).json({ message: "Invalid channelId" });
  }

  try {
    const existing = await subscription
      .findOne({ subscriber: userId, channel: channelId })
      .select("_id");
    const subscribers = await subscription.countDocuments({ channel: channelId });

    return res.status(200).json({
      subscribed: Boolean(existing),
      subscribers,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
